import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
interface DeletePipelineOptions {
    esClient: ElasticsearchClient;
    id: string;
    logger: Logger;
}
interface PipelineManagementOptions {
    esClient: ElasticsearchClient;
    pipeline: IngestPutPipelineRequest;
    logger: Logger;
}
export declare function deleteIngestPipeline({ esClient, id, logger }: DeletePipelineOptions): Promise<void>;
export declare function upsertIngestPipeline({ esClient, pipeline, logger, }: PipelineManagementOptions): Promise<void>;
export {};
