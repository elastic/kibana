import type { IDataStreamClient } from '@kbn/data-streams';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type CommonSearchOptions } from '../query_utils';
import { type StoredVerdict, type Verdict, type verdictsMappings } from './data_stream';
export type VerdictDataStreamClient = IDataStreamClient<typeof verdictsMappings, StoredVerdict>;
export declare class VerdictClient {
    private readonly clients;
    constructor(clients: {
        dataStreamClient: VerdictDataStreamClient;
        esClient: ElasticsearchClient;
        space: string;
    });
    bulkCreate(verdicts: Verdict[]): Promise<import("@elastic/elasticsearch/lib/api/types").BulkResponse>;
    findLatest(options?: CommonSearchOptions): Promise<{
        hits: Verdict[];
    }>;
}
