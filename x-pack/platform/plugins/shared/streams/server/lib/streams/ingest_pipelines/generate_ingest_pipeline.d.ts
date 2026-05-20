import { Streams } from '@kbn/streams-schema';
import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
export declare function generateIngestPipeline(name: string, definition: Streams.all.Definition, esClient: ElasticsearchClient): Promise<IngestPutPipelineRequest>;
export declare function generateClassicIngestPipelineBody(definition: Streams.ingest.all.Definition, esClient: ElasticsearchClient): Promise<Partial<IngestPutPipelineRequest>>;
