import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import type { QueryCorrection } from './types';
/**
 * Correct timespan literal grammar mistakes, and returns the list of corrections that got applied.
 *
 * E.g.
 * `DATE_TRUNC("YEAR", @timestamp)` => `DATE_TRUNC(1 year, @timestamp)`
 * `BUCKET(@timestamp, "1 week")` => `BUCKET(@timestamp, 1 week)`
 *
 */
export declare const correctTimespanLiterals: (query: ESQLAstQueryExpression) => QueryCorrection[];
