import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import type { DownloadSource, FleetProxy, FleetServerHost, NewFleetProxy, Output } from '../types';
export declare function listFleetProxies(soClient: SavedObjectsClientContract): Promise<{
    items: FleetProxy[];
    total: number;
    page: number;
    perPage: number;
}>;
export declare function createFleetProxy(soClient: SavedObjectsClientContract, data: NewFleetProxy, options?: {
    id?: string;
    overwrite?: boolean;
    fromPreconfiguration?: boolean;
}): Promise<FleetProxy>;
export declare function getFleetProxy(soClient: SavedObjectsClientContract, id: string): Promise<FleetProxy>;
export declare function deleteFleetProxy(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, id: string, options?: {
    fromPreconfiguration?: boolean;
}): Promise<{}>;
export declare function updateFleetProxy(soClient: SavedObjectsClientContract, id: string, data: Partial<FleetProxy>, options?: {
    fromPreconfiguration?: boolean;
}): Promise<{
    id: string;
    proxy_headers?: Record<string, string | number | boolean> | null;
    name: string;
    url: string;
    certificate_authorities?: string | null;
    certificate?: string | null;
    certificate_key?: string | null;
    is_preconfigured: boolean;
}>;
export declare function bulkGetFleetProxies(soClient: SavedObjectsClientContract, ids: string[], { ignoreNotFound }?: {
    ignoreNotFound?: true;
}): Promise<FleetProxy[]>;
export declare function getFleetProxyRelatedSavedObjects(proxyId: string): Promise<{
    fleetServerHosts: FleetServerHost[];
    outputs: Output[];
    downloadSources: DownloadSource[];
}>;
