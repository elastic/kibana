import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataStreamDocsStat } from '../../../../common/api_types';
import type { DataStreamType } from '../../../../common/types';
export declare function getFailedDocsPaginated(options: {
    esClient: ElasticsearchClient;
    types: DataStreamType[];
    datasetQuery?: string;
    start: number;
    end: number;
}): Promise<DataStreamDocsStat[]>;
