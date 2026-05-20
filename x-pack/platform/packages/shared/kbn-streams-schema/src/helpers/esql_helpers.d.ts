import type { ESQLSingleAstItem } from '@elastic/esql/types';
import type { QueryType } from '../queries';
/**
 * Prepends the `SET unmapped_fields="LOAD";` directive to an ES|QL query.
 * This tells ES|QL to load unmapped fields from `_source` as keyword
 * instead of raising "Unknown column" errors.
 */
export declare function withUnmappedFieldsDirective(query: string): string;
/**
 * Builds the ES|QL AST node for `METADATA _id, _source`.
 * Shared across all locations that construct or augment FROM commands.
 */
export declare function buildMetadataOption(): import("@elastic/esql/types").ESQLCommandOption;
/**
 * Parses the given ES|QL query string and returns the first argument of
 * the WHERE command as an AST node, or `undefined` when no WHERE clause
 * is present (or the argument is an unexpected array).
 */
export declare function extractWhereExpression(esql: string): ESQLSingleAstItem | undefined;
/**
 * Ensures the ES|QL query contains `METADATA _id, _source` in its FROM
 * clause. Returns the query unchanged if METADATA is already present.
 */
export declare function ensureMetadata(esql: string): string;
/**
 * Normalizes an ES|QL query string by parsing it into an AST and
 * pretty-printing it back. This strips comments, collapses whitespace,
 * and uppercases command/keyword names so that two syntactically
 * equivalent queries produce the same string.
 */
export declare function normalizeEsqlQuery(esql: string): string;
/**
 * Like {@link normalizeEsqlQuery} but never throws and additionally
 * sorts commutative AND/OR operands so that `WHERE a AND b` and
 * `WHERE b AND a` produce the same canonical string. Falls back to
 * whitespace normalization when the parser cannot handle the input.
 */
export declare function normalizeEsqlSafe(esql: string): string;
/**
 * Returns `true` when two ES|QL query strings are semantically
 * equivalent after deep AST-based normalization (including
 * commutative AND/OR operand ordering).
 */
export declare function hasSameEsql(a: string, b: string): boolean;
/**
 * Returns the list of index source names from the FROM clause of an
 * ES|QL query. Returns an empty array when there is no FROM clause.
 */
export declare function getFromSources(esql: string): string[];
/**
 * Replaces all index sources in the FROM clause with `newSources`,
 * preserving any non-source arguments (e.g. METADATA options).
 * Returns the query unchanged when there is no FROM clause.
 */
export declare function replaceFromSources(esql: string, newSources: string[]): string;
/**
 * Returns `true` when the ES|QL query contains a STATS command,
 * indicating an aggregation-based (symptom) query rather than a
 * row-level (cause / match) query.
 *
 * When parsing succeeds the AST is inspected for a `stats` command.
 * On parse failure a regex fallback (`STATS_REGEX`) is used so that
 * unparseable queries containing `| STATS` are still classified
 * correctly rather than silently defaulting to `match`.
 *
 * **Limitation**: the regex fallback can misclassify if `| STATS`
 * appears inside a string literal or comment. Callers in validation
 * paths (e.g. {@link validateEsqlQueryForStreamOrThrow}) should
 * parse independently so a parse failure surfaces before classification.
 */
export declare function hasStatsCommand(esql: string): boolean;
/**
 * Derives the canonical {@link QueryType} from an ES|QL query string
 * by checking whether it contains a STATS command.
 */
export declare function deriveQueryType(esql: string): QueryType;
/**
 * Returns quality hints for STATS queries to feed back to the LLM.
 * Checks for common structural issues in aggregate queries.
 * Returns an empty array for non-STATS queries or when no issues are found.
 *
 * Note: This re-parses the ES|QL string (same as {@link hasStatsCommand}).
 * The double parse is intentional — callers may invoke only one of the two
 * functions, and merging them would couple unrelated responsibilities.
 */
export declare function getStatsQueryHints(esql: string): string[];
/**
 * Extracts the output column names from the STATS command's BY clause.
 * Used to identify group-by dimensions for preview multi-group detection
 * and potential future alert identity hashing.
 *
 * Returns column names in sorted order for deterministic comparison.
 * Returns an empty array when no STATS or BY clause is found, or on parse failure.
 */
export declare function extractStatsGroupColumns(esql: string): string[];
/**
 * Extracts the output column name for the temporal BUCKET/TBUCKET call
 * in the STATS command's BY clause.
 *
 * Returns `null` when no bucket call is found or the query fails to parse.
 */
export declare function extractBucketColumnName(esql: string): string | null;
export declare const MS_PER_UNIT: Record<string, number>;
/**
 * Extracts the source field passed as the first argument to BUCKET/TBUCKET
 * (e.g. `@timestamp` in `BUCKET(@timestamp, 5 minutes)`).
 *
 * Returns `null` when no temporal bucketing is found or the query fails to parse.
 */
export declare function extractBucketTargetField(esql: string): string | null;
/**
 * Extracts the temporal bucket interval from a STATS query's
 * `BUCKET(@timestamp, N unit)` or `TBUCKET(@timestamp, N unit)` call
 * and returns the interval in milliseconds.
 *
 * Returns `null` when no temporal bucketing is found.
 */
export declare function extractBucketIntervalMs(esql: string): number | null;
/**
 * Rewrites the index sources in the FROM clause of an ES|QL query.
 * Each index source name is passed through `transform`; if the
 * returned value differs the source is replaced. Returns the original
 * string unchanged when there is no FROM clause or no source was
 * modified.
 */
export declare function rewriteFromSources(esql: string, transform: (index: string) => string): string;
