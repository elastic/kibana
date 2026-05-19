import type { estypes } from '@elastic/elasticsearch';
import type { JsonObject } from '@kbn/utility-types';
import type { LogEntry, LogEntryCursor } from '../../../../common/log_entry';
import type { LogViewColumnConfiguration, LogViewReference, ResolvedLogView } from '../../../../common/log_views';
import type { Fields, Highlights } from '../../../services/log_entries/message/message';
import type { LogsSharedPluginRequestHandlerContext } from '../../../types';
import type { LogsSharedBackendLibs } from '../../logs_shared_types';
export interface LogEntriesParams {
    startTimestamp: number;
    endTimestamp: number;
    size?: number;
    query?: JsonObject;
    cursor?: {
        before: LogEntryCursor | 'last';
    } | {
        after: LogEntryCursor | 'first';
    };
    highlightTerm?: string;
}
export declare const LOG_ENTRIES_PAGE_SIZE = 200;
export interface ILogsSharedLogEntriesDomain {
    getLogEntries(requestContext: LogsSharedPluginRequestHandlerContext, logView: LogViewReference, params: LogEntriesParams, columnOverrides?: LogViewColumnConfiguration[]): Promise<{
        entries: LogEntry[];
        hasMoreBefore?: boolean;
        hasMoreAfter?: boolean;
    }>;
    getLogEntryDatasets(requestContext: LogsSharedPluginRequestHandlerContext, timestampField: string, indexName: string, startTime: number, endTime: number, runtimeMappings: estypes.MappingRuntimeFields): Promise<string[]>;
}
export declare class LogsSharedLogEntriesDomain implements ILogsSharedLogEntriesDomain {
    private readonly adapter;
    private readonly libs;
    constructor(adapter: LogEntriesAdapter, libs: Pick<LogsSharedBackendLibs, 'framework' | 'getStartServices'>);
    getLogEntries(requestContext: LogsSharedPluginRequestHandlerContext, logView: LogViewReference, params: LogEntriesParams, columnOverrides?: LogViewColumnConfiguration[]): Promise<{
        entries: LogEntry[];
        hasMoreBefore?: boolean;
        hasMoreAfter?: boolean;
    }>;
    getLogEntryDatasets(requestContext: LogsSharedPluginRequestHandlerContext, timestampField: string, indexName: string, startTime: number, endTime: number, runtimeMappings: estypes.MappingRuntimeFields): Promise<string[]>;
}
export interface LogEntriesAdapter {
    getLogEntries(requestContext: LogsSharedPluginRequestHandlerContext, resolvedLogView: ResolvedLogView, fields: string[], params: LogEntriesParams): Promise<{
        documents: LogEntryDocument[];
        hasMoreBefore?: boolean;
        hasMoreAfter?: boolean;
    }>;
}
export type LogEntryQuery = JsonObject;
export interface LogEntryDocument {
    id: string;
    index: string;
    fields: Fields;
    highlights: Highlights;
    cursor: LogEntryCursor;
}
