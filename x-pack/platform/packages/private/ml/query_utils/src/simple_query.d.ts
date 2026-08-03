import type { SimpleQuery } from './types';
/**
 * Default instance of `SimpleQuery` with a wildcard query string.
 */
export declare const defaultSimpleQuery: SimpleQuery<'*'>;
/**
 * Type guard verifying if an argument is a `SimpleQuery`.
 * @param {unknown} arg - Argument to check.
 * @returns {boolean} True if `arg` is a `SimpleQuery`, false otherwise.
 */
export declare function isSimpleQuery(arg: unknown): arg is SimpleQuery;
/**
 * Type guard verifying if an argument is a `SimpleQuery` with a default query.
 * @param {unknown} arg - Argument to check.
 * @returns {boolean} True if `arg` is a `SimpleQuery`, false otherwise.
 */
export declare function isSimpleDefaultQuery(arg: unknown): arg is SimpleQuery<'*'>;
