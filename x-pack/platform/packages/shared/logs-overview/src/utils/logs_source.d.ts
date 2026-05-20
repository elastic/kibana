import { type DataViewsContract, type DataView } from '@kbn/data-views-plugin/common';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
export type LogsSourceConfiguration = SharedSettingLogsSourceConfiguration | IndexNameLogsSourceConfiguration | DataViewLogsSourceConfiguration;
export interface SharedSettingLogsSourceConfiguration {
    type: 'shared_setting';
    timestampField?: string;
    messageField?: string;
}
export interface IndexNameLogsSourceConfiguration {
    type: 'index_name';
    indexName: string;
    timestampField: string;
    messageField: string;
}
export interface DataViewLogsSourceConfiguration {
    type: 'data_view';
    dataView: DataView;
    messageField?: string;
}
export type ResolvedIndexNameLogsSourceConfiguration = IndexNameLogsSourceConfiguration & {
    dataView: DataView;
};
export declare const resolveLogsSourceActor: ({ logsDataAccess, dataViewsService, }: {
    logsDataAccess: LogsDataAccessPluginStart;
    dataViewsService: DataViewsContract;
}) => import("xstate").PromiseActorLogic<ResolvedIndexNameLogsSourceConfiguration, {
    logsSource: LogsSourceConfiguration;
}, import("xstate").EventObject>;
export declare const normalizeLogsSource: ({ logsDataAccess, dataViewsService, }: {
    logsDataAccess: LogsDataAccessPluginStart;
    dataViewsService: DataViewsContract;
}) => (logsSource: LogsSourceConfiguration) => Promise<ResolvedIndexNameLogsSourceConfiguration>;
