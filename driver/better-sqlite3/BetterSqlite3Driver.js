"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetterSqlite3Driver = void 0;
var tslib_1 = require("tslib");
var mkdirp_1 = (0, tslib_1.__importDefault)(require("mkdirp"));
var path_1 = (0, tslib_1.__importDefault)(require("path"));
var DriverPackageNotInstalledError_1 = require("../../error/DriverPackageNotInstalledError");
var DriverOptionNotSetError_1 = require("../../error/DriverOptionNotSetError");
var PlatformTools_1 = require("../../platform/PlatformTools");
var AbstractSqliteDriver_1 = require("../sqlite-abstract/AbstractSqliteDriver");
var BetterSqlite3QueryRunner_1 = require("./BetterSqlite3QueryRunner");
var PathUtils_1 = require("../../util/PathUtils");
/**
 * Organizes communication with sqlite DBMS.
 */
var BetterSqlite3Driver = /** @class */ (function (_super) {
    (0, tslib_1.__extends)(BetterSqlite3Driver, _super);
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function BetterSqlite3Driver(connection) {
        var _this = _super.call(this, connection) || this;
        _this.connection = connection;
        _this.options = connection.options;
        _this.database = _this.options.database;
        // validate options to make sure everything is set
        if (!_this.options.database)
            throw new DriverOptionNotSetError_1.DriverOptionNotSetError("database");
        // load sqlite package
        _this.loadDependencies();
        return _this;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Closes connection with database.
     */
    BetterSqlite3Driver.prototype.disconnect = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            return (0, tslib_1.__generator)(this, function (_a) {
                this.queryRunner = undefined;
                this.databaseConnection.close();
                return [2 /*return*/];
            });
        });
    };
    /**
     * Creates a query runner used to execute database queries.
     */
    BetterSqlite3Driver.prototype.createQueryRunner = function (mode) {
        if (!this.queryRunner)
            this.queryRunner = new BetterSqlite3QueryRunner_1.BetterSqlite3QueryRunner(this);
        return this.queryRunner;
    };
    BetterSqlite3Driver.prototype.normalizeType = function (column) {
        if (column.type === Buffer) {
            return "blob";
        }
        return _super.prototype.normalizeType.call(this, column);
    };
    BetterSqlite3Driver.prototype.afterConnect = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            return (0, tslib_1.__generator)(this, function (_a) {
                return [2 /*return*/, this.attachDatabases()];
            });
        });
    };
    /**
     * For SQLite, the database may be added in the decorator metadata. It will be a filepath to a database file.
     */
    BetterSqlite3Driver.prototype.buildTableName = function (tableName, _schema, database) {
        if (!database)
            return tableName;
        if (this.getAttachedDatabaseHandleByRelativePath(database))
            return this.getAttachedDatabaseHandleByRelativePath(database) + "." + tableName;
        if (database === this.options.database)
            return tableName;
        // we use the decorated name as supplied when deriving attach handle (ideally without non-portable absolute path)
        var identifierHash = (0, PathUtils_1.filepathToName)(database);
        // decorated name will be assumed relative to main database file when non absolute. Paths supplied as absolute won't be portable
        var absFilepath = (0, PathUtils_1.isAbsolute)(database) ? database : path_1.default.join(this.getMainDatabasePath(), database);
        this.attachedDatabases[database] = {
            attachFilepathAbsolute: absFilepath,
            attachFilepathRelative: database,
            attachHandle: identifierHash,
        };
        return identifierHash + "." + tableName;
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates connection with the database.
     */
    BetterSqlite3Driver.prototype.createDatabaseConnection = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var _a, database, _b, readonly, _c, fileMustExist, _d, timeout, _e, verbose, prepareDatabase, databaseConnection;
            return (0, tslib_1.__generator)(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (!(this.options.database !== ":memory:")) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.createDatabaseDirectory(path_1.default.dirname(this.options.database))];
                    case 1:
                        _f.sent();
                        _f.label = 2;
                    case 2:
                        _a = this.options, database = _a.database, _b = _a.readonly, readonly = _b === void 0 ? false : _b, _c = _a.fileMustExist, fileMustExist = _c === void 0 ? false : _c, _d = _a.timeout, timeout = _d === void 0 ? 5000 : _d, _e = _a.verbose, verbose = _e === void 0 ? null : _e, prepareDatabase = _a.prepareDatabase;
                        databaseConnection = this.sqlite(database, { readonly: readonly, fileMustExist: fileMustExist, timeout: timeout, verbose: verbose });
                        // in the options, if encryption key for SQLCipher is setted.
                        // Must invoke key pragma before trying to do any other interaction with the database.
                        if (this.options.key) {
                            databaseConnection.exec("PRAGMA key = " + JSON.stringify(this.options.key));
                        }
                        // function to run before a database is used in typeorm.
                        if (typeof prepareDatabase === "function") {
                            prepareDatabase(databaseConnection);
                        }
                        // we need to enable foreign keys in sqlite to make sure all foreign key related features
                        // working properly. this also makes onDelete to work with sqlite.
                        databaseConnection.exec("PRAGMA foreign_keys = ON");
                        // turn on WAL mode to enhance performance
                        databaseConnection.exec("PRAGMA journal_mode = WAL");
                        return [2 /*return*/, databaseConnection];
                }
            });
        });
    };
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    BetterSqlite3Driver.prototype.loadDependencies = function () {
        try {
            var sqlite = this.options.driver || PlatformTools_1.PlatformTools.load("better-sqlite3");
            this.sqlite = sqlite;
        }
        catch (e) {
            throw new DriverPackageNotInstalledError_1.DriverPackageNotInstalledError("SQLite", "better-sqlite3");
        }
    };
    /**
     * Auto creates database directory if it does not exist.
     */
    BetterSqlite3Driver.prototype.createDatabaseDirectory = function (dbPath) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, mkdirp_1.default)(dbPath)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Performs the attaching of the database files. The attachedDatabase should have been populated during calls to #buildTableName
     * during EntityMetadata production (see EntityMetadata#buildTablePath)
     *
     * https://sqlite.org/lang_attach.html
     */
    BetterSqlite3Driver.prototype.attachDatabases = function () {
        var e_1, _a;
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var _b, _c, _d, attachHandle, attachFilepathAbsolute, e_1_1;
            return (0, tslib_1.__generator)(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 7, 8, 13]);
                        _b = (0, tslib_1.__asyncValues)(Object.values(this.attachedDatabases));
                        _e.label = 1;
                    case 1: return [4 /*yield*/, _b.next()];
                    case 2:
                        if (!(_c = _e.sent(), !_c.done)) return [3 /*break*/, 6];
                        _d = _c.value, attachHandle = _d.attachHandle, attachFilepathAbsolute = _d.attachFilepathAbsolute;
                        return [4 /*yield*/, this.createDatabaseDirectory(path_1.default.dirname(attachFilepathAbsolute))];
                    case 3:
                        _e.sent();
                        return [4 /*yield*/, this.connection.query("ATTACH \"" + attachFilepathAbsolute + "\" AS \"" + attachHandle + "\"")];
                    case 4:
                        _e.sent();
                        _e.label = 5;
                    case 5: return [3 /*break*/, 1];
                    case 6: return [3 /*break*/, 13];
                    case 7:
                        e_1_1 = _e.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 13];
                    case 8:
                        _e.trys.push([8, , 11, 12]);
                        if (!(_c && !_c.done && (_a = _b.return))) return [3 /*break*/, 10];
                        return [4 /*yield*/, _a.call(_b)];
                    case 9:
                        _e.sent();
                        _e.label = 10;
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 12: return [7 /*endfinally*/];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    BetterSqlite3Driver.prototype.getMainDatabasePath = function () {
        var optionsDb = this.options.database;
        return path_1.default.dirname((0, PathUtils_1.isAbsolute)(optionsDb) ? optionsDb : path_1.default.join(this.options.baseDirectory, optionsDb));
    };
    return BetterSqlite3Driver;
}(AbstractSqliteDriver_1.AbstractSqliteDriver));
exports.BetterSqlite3Driver = BetterSqlite3Driver;

//# sourceMappingURL=BetterSqlite3Driver.js.map
