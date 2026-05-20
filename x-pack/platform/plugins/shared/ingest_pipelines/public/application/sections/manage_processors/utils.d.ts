import type { DatabaseType } from '../../../../common/types';
export declare const MMDB_EXTENSION = ".mmdb";
/**
 * Returns the value/id of the database, if it exists.
 *
 * @param databaseText The human-readable name of the database
 * @param type If specified, searches only in the database name options for this type
 */
export declare const getDatabaseValue: (databaseText: string, type?: DatabaseType) => string | undefined;
/**
 * Returns the human-readable name of the database, if it exists.
 *
 * @param databaseText The id/value of the database
 * @param type If specified, searches only in the database name options for this type
 */
export declare const getDatabaseText: (databaseValue: string, type?: DatabaseType) => string | undefined;
/**
 * Returns the normalized filename of the database.
 * @param name The name of the database
 * @returns The normalized filename of the database
 */
export declare const normalizeMmdbFilename: (name: string) => string;
/**
 * Returns the label of the database, if it exists.
 * @param item The database item
 * @returns The label of the database
 */
export declare const getDatabaseOptionLabel: (item: {
    type: DatabaseType;
    name: string;
}) => string;
