import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { FleetConfigType } from '../../config';
import type { FleetServerHost } from '../../types';
export declare function getCloudFleetServersHosts(): string[] | undefined;
export declare function getPreconfiguredFleetServerHostFromConfig(config?: FleetConfigType): FleetServerHost[];
export declare function ensurePreconfiguredFleetServerHosts(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, preconfiguredFleetServerHosts: FleetServerHost[]): Promise<void>;
export declare function createOrUpdatePreconfiguredFleetServerHosts(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, preconfiguredFleetServerHosts: FleetServerHost[]): Promise<void>;
export declare function createCloudFleetServerHostIfNeeded(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient): Promise<void>;
export declare function cleanPreconfiguredFleetServerHosts(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, preconfiguredFleetServerHosts: FleetServerHost[]): Promise<void>;
