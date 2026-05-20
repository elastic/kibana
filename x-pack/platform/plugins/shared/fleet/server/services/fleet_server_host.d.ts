import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { FleetServerHost, NewFleetServerHost, AgentPolicy } from '../types';
declare class FleetServerHostService {
    private get soClient();
    private get encryptedSoClient();
    create(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, fleetServerHost: NewFleetServerHost, options?: {
        id?: string;
        overwrite?: boolean;
        fromPreconfiguration?: boolean;
        secretHashes?: Record<string, any>;
    }): Promise<FleetServerHost>;
    get(id: string): Promise<FleetServerHost>;
    list(): Promise<{
        items: FleetServerHost[];
        total: number;
        page: number;
        perPage: number;
    }>;
    listAllForProxyId(proxyId: string): Promise<{
        items: FleetServerHost[];
        total: number;
        page: number;
        perPage: number;
    }>;
    delete(esClient: ElasticsearchClient, id: string, options?: {
        fromPreconfiguration?: boolean;
    }): Promise<{}>;
    update(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, id: string, data: Partial<FleetServerHost>, options?: {
        fromPreconfiguration?: boolean;
        secretHashes?: Record<string, any>;
    }): Promise<{
        name: string;
        host_urls: string[];
        is_default: boolean;
        is_preconfigured: boolean;
        is_internal?: boolean;
        proxy_id?: string | null;
        secrets?: {
            ssl?: {
                key?: import("../../common/types").SOSecret;
                es_key?: import("../../common/types").SOSecret;
                agent_key?: import("../../common/types").SOSecret;
            };
        } | {
            ssl?: {
                key?: {
                    id: string;
                };
                es_key?: {
                    id: string;
                };
                agent_key?: {
                    id: string;
                };
            };
        } | undefined;
        ssl?: string | {
            certificate_authorities?: string[];
            certificate?: string;
            key?: string;
            es_certificate_authorities?: string[];
            es_certificate?: string;
            es_key?: string;
            client_auth?: import("../../common/types").ValueOf<import("../../common/types").ClientAuth>;
            agent_certificate_authorities?: string[];
            agent_certificate?: string;
            agent_key?: string;
        } | null | undefined;
        id: string;
    }>;
    bulkGet(ids: string[], { ignoreNotFound }?: {
        ignoreNotFound?: true;
    }): Promise<FleetServerHost[]>;
    /**
     * Get the default Fleet server policy hosts or throw if it does not exists
     */
    getDefaultFleetServerHost(): Promise<FleetServerHost | null>;
}
export declare const fleetServerHostService: FleetServerHostService;
export declare function getFleetServerHostsForAgentPolicy(soClient: SavedObjectsClientContract, agentPolicy: Pick<AgentPolicy, 'fleet_server_host_id'>): Promise<FleetServerHost>;
/**
 * Migrate Global setting fleet server hosts to their own saved object
 */
export declare function migrateSettingsToFleetServerHost(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient): Promise<void>;
export {};
