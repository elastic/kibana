import type { AggregationsCompositeAggregateKey, QueryDslBoolQuery } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataStreamDocsStat } from '../../../common/api_types';
interface Dataset extends AggregationsCompositeAggregateKey {
    dataset: string;
}
export declare function getAggregatedDatasetPaginatedResults(options: {
    esClient: ElasticsearchClient;
    index: string;
    start: number;
    end: number;
    query?: QueryDslBoolQuery;
    after?: Dataset;
    prevResults?: DataStreamDocsStat[];
}): Promise<DataStreamDocsStat[]>;
export {};
