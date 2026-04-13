import type { SecurityHasPrivilegesPrivileges, SecurityIndexPrivilege } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
declare class DatasetQualityPrivileges {
    getHasIndexPrivileges(esClient: ElasticsearchClient, indexes: string[], privileges: SecurityIndexPrivilege[]): Promise<Awaited<Record<string, SecurityHasPrivilegesPrivileges>>>;
    getCanViewIntegrations(esClient: ElasticsearchClient, space?: string): Promise<boolean>;
    getDatasetPrivileges(esClient: ElasticsearchClient, dataset: string[], space?: string): Promise<{
        datasetsPrivilages: Record<string, {
            canRead: boolean;
            canMonitor: boolean;
            canReadFailureStore: boolean;
            canManageFailureStore: boolean;
        }>;
        canViewIntegrations: boolean;
    }>;
    canReadDataset(esClient: ElasticsearchClient, type?: "logs" | "metrics" | "traces" | "synthetics" | "profiling", datasetQuery?: string, space?: string): Promise<boolean>;
    throwIfCannotReadDataset(esClient: ElasticsearchClient, type?: "logs" | "metrics" | "traces" | "synthetics" | "profiling", datasetQuery?: string, space?: string): Promise<void>;
}
export declare const datasetQualityPrivileges: DatasetQualityPrivileges;
export {};
