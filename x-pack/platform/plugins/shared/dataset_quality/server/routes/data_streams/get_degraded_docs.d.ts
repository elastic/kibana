import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataStreamType } from '../../../common/types';
import type { DataStreamDocsStat } from '../../../common/api_types';
export declare function getDegradedDocsPaginated(options: {
    esClient: ElasticsearchClient;
    types: DataStreamType[];
    datasetQuery?: string;
    start: number;
    end: number;
}): Promise<DataStreamDocsStat[]>;
