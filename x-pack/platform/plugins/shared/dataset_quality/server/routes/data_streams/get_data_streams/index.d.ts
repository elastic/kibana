import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataStreamType } from '../../../../common/types';
export declare function getDataStreams(options: {
    esClient: ElasticsearchClient;
    types?: DataStreamType[];
    datasetQuery?: string;
    uncategorisedOnly?: boolean;
}): Promise<{
    dataStreams: {
        name: string;
        integration: any;
        lastActivity: any;
        userPrivileges: {
            canMonitor: boolean;
            canReadFailureStore: boolean;
            canManageFailureStore: boolean;
        };
        hasFailureStore: boolean | undefined;
        customRetentionPeriod: any;
        defaultRetentionPeriod: any;
    }[];
    datasetUserPrivileges: {
        datasetsPrivilages: Record<string, {
            canRead: boolean;
            canMonitor: boolean;
            canReadFailureStore: boolean;
            canManageFailureStore: boolean;
        }>;
        canViewIntegrations: boolean;
    };
}>;
export declare function getDatasetTypesPrivileges(options: {
    esClient: ElasticsearchClient;
    types: DataStreamType[];
}): Promise<{
    datasetsPrivilages: Record<string, {
        canRead: boolean;
        canMonitor: boolean;
        canReadFailureStore: boolean;
        canManageFailureStore: boolean;
    }>;
}>;
