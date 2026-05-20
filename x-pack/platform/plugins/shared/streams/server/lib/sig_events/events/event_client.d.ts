import type { IDataStreamClient } from '@kbn/data-streams';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type CommonSearchOptions } from '../query_utils';
import { type SigEvent, type StoredEvent, type eventsMappings } from './data_stream';
export type EventDataStreamClient = IDataStreamClient<typeof eventsMappings, StoredEvent>;
export declare class EventClient {
    private readonly clients;
    constructor(clients: {
        dataStreamClient: EventDataStreamClient;
        esClient: ElasticsearchClient;
        space: string;
    });
    bulkCreate(events: SigEvent[]): Promise<import("@elastic/elasticsearch/lib/api/types").BulkResponse>;
    findLatest(options?: CommonSearchOptions): Promise<{
        hits: SigEvent[];
    }>;
}
