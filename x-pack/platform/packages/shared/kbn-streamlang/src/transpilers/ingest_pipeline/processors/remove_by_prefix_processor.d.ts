import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IngestPipelineRemoveByPrefixProcessor } from '../../../../types/processors/ingest_pipeline_processors';
export declare const processRemoveByPrefixProcessor: (removeByPrefixProcessor: IngestPipelineRemoveByPrefixProcessor) => IngestProcessorContainer[];
