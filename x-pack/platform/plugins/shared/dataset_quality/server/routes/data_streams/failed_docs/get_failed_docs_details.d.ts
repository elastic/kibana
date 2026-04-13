import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { FailedDocsDetails } from '../../../../common/api_types';
export declare function getFailedDocsDetails({ esClient, start, end, dataStream, }: {
    esClient: ElasticsearchClient;
    start: number;
    end: number;
    dataStream: string;
}): Promise<FailedDocsDetails>;
