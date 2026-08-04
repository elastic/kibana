import type { DatatableRow, ExpressionsStart } from '@kbn/expressions-plugin/public';
export interface ExecuteEsqlQueryOptions<Input> {
    expressions: ExpressionsStart;
    query: string;
    abortSignal?: AbortSignal;
    input: Input;
    /** When true, passes `allowCache: false` to `expressions.execute` to bypass expression-layer caching. */
    noCache?: boolean;
}
/**
 * Executes an ES|QL query through the expressions plugin, using Discover's `esql` function,
 * which also transforms the tabular result into a datatable-ready data structure.
 * Passes timeField so that input.timeRange is applied as a filter on @timestamp.
 *
 * Pass a row type parameter to get typed rows instead of `DatatableRow`.
 */
export declare const executeEsqlQuery: <TRow extends object = DatatableRow, Input = unknown>({ expressions, query, input, abortSignal, noCache, }: ExecuteEsqlQueryOptions<Input>) => Promise<TRow[]>;
