import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { FleetConfigType } from '../../config';
import type { FleetProxy } from '../../types';
export declare function getPreconfiguredFleetProxiesFromConfig(config?: FleetConfigType): any;
export declare function ensurePreconfiguredFleetProxies(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, preconfiguredFleetProxies: FleetProxy[]): Promise<void>;
