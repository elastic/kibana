import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
export declare const FETCH_LOG_BY_ID_OPERATION_ID = "fetch-log-by-id";
export declare const fetchLogDocumentById: ({ id, data, logSourcesService, index, }: {
    id: string;
    data: DataPublicPluginStart;
    logSourcesService: LogSourcesService;
    index?: string;
}, signal: AbortSignal) => Promise<{
    _index: string;
    fields: Record<PropertyKey, any> | undefined;
} | undefined>;
