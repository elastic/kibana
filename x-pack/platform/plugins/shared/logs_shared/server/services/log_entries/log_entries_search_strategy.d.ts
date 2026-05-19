import * as rt from 'io-ts';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import type { ISearchStrategy, PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { LogEntriesSearchRequestParams, LogEntriesSearchResponsePayload } from '../../../common/search_strategies/log_entries/log_entries';
import type { LogViewsServiceStart } from '../log_views/types';
type LogEntriesSearchRequest = IKibanaSearchRequest<LogEntriesSearchRequestParams>;
type LogEntriesSearchResponse = IKibanaSearchResponse<LogEntriesSearchResponsePayload>;
export declare const logEntriesSearchStrategyProvider: ({ data, logViews, }: {
    data: DataPluginStart;
    logViews: LogViewsServiceStart;
}) => ISearchStrategy<LogEntriesSearchRequest, LogEntriesSearchResponse>;
export declare const logEntriesSearchRequestStateRT: rt.Type<{
    esRequestId: string;
}, string, unknown>;
export {};
