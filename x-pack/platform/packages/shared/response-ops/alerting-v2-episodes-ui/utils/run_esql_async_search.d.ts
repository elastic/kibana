import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
export interface RunEsqlAsyncSearchOptions {
    data: DataPublicPluginStart;
    params: ESQLSearchParams;
    abortSignal?: AbortSignal;
}
/**
 * Runs an ES|QL query via the data plugin async ES|QL search strategy.
 */
export declare const runEsqlAsyncSearch: ({ data, params, abortSignal, }: RunEsqlAsyncSearchOptions) => Promise<ESQLSearchResponse>;
