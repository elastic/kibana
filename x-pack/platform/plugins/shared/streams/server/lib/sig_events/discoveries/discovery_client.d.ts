import type { IDataStreamClient } from '@kbn/data-streams';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type CommonSearchOptions } from '../query_utils';
import { type Discovery, type StoredDiscovery, type discoveriesMappings } from './data_stream';
export type DiscoveryDataStreamClient = IDataStreamClient<typeof discoveriesMappings, StoredDiscovery>;
export declare class DiscoveryClient {
    private readonly clients;
    constructor(clients: {
        dataStreamClient: DiscoveryDataStreamClient;
        esClient: ElasticsearchClient;
        space: string;
    });
    bulkCreate(discoveries: Discovery[]): Promise<import("@elastic/elasticsearch/lib/api/types").BulkResponse>;
    findLatest(options?: CommonSearchOptions): Promise<{
        hits: Discovery[];
    }>;
}
