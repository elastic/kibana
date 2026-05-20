import type { ElasticsearchClient, ISavedObjectsImporter, SavedObjectsClientContract } from '@kbn/core/server';
export declare const FLEET_SYNCED_INTEGRATIONS_INDEX_NAME = "fleet-synced-integrations";
export declare const FLEET_SYNCED_INTEGRATIONS_CCR_INDEX_PREFIX = "fleet-synced-integrations-ccr-*";
export declare const FLEET_SYNCED_INTEGRATIONS_INDEX_CONFIG: {
    settings: {
        auto_expand_replicas: string;
    };
    mappings: {
        dynamic: boolean;
        _meta: {
            version: string;
        };
        properties: {
            remote_es_hosts: {
                properties: {
                    name: {
                        type: string;
                    };
                    hosts: {
                        type: string;
                    };
                    sync_integrations: {
                        type: string;
                    };
                };
            };
            integrations: {
                properties: {
                    package_name: {
                        type: string;
                    };
                    package_version: {
                        type: string;
                    };
                    updated_at: {
                        type: string;
                    };
                };
            };
        };
    };
};
export declare const canEnableSyncIntegrations: () => boolean | undefined;
export declare function createOrUpdateFleetSyncedIntegrationsIndex(esClient: ElasticsearchClient): Promise<void>;
export declare function createCCSIndexPatterns(esClient: ElasticsearchClient, savedObjectsClient: SavedObjectsClientContract, savedObjectsImporter: ISavedObjectsImporter): Promise<void>;
