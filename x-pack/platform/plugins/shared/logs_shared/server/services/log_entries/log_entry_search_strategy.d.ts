import * as rt from 'io-ts';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import type { ISearchStrategy, PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { LogEntrySearchRequestParams, LogEntrySearchResponsePayload } from '../../../common/search_strategies/log_entries/log_entry';
import type { LogViewsServiceStart } from '../log_views/types';
type LogEntrySearchRequest = IKibanaSearchRequest<LogEntrySearchRequestParams>;
type LogEntrySearchResponse = IKibanaSearchResponse<LogEntrySearchResponsePayload>;
export declare const logEntrySearchStrategyProvider: ({ data, logViews, }: {
    data: DataPluginStart;
    logViews: LogViewsServiceStart;
}) => ISearchStrategy<LogEntrySearchRequest, LogEntrySearchResponse>;
export declare const logEntrySearchRequestStateRT: rt.Type<{
    esRequestId: string;
}, string, unknown>;
export {};
