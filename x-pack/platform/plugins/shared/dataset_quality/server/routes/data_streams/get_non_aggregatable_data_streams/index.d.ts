import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { DataStreamType } from '../../../../common/types';
export declare function getNonAggregatableDataStreams({ esClient, types, start, end, dataStream, }: {
    esClient: ElasticsearchClient;
    types?: DataStreamType[];
    start: number;
    end: number;
    dataStream?: string;
}): Promise<{
    aggregatable: boolean;
    datasets: string[];
}>;
