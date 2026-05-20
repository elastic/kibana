import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IngestPipelineProcessor } from '../../../../types/processors/ingest_pipeline_processors';
import type { StreamlangProcessorDefinition } from '../../../../types/processors';
/**
 * Mapping of Streamlng processor fields to Ingest processor fields.
 */
export declare const processorFieldRenames: Record<string, Record<string, string>>;
export declare function renameFields<T extends Record<string, unknown>>(obj: T, renames: Record<string, string>): T;
export declare const applyPreProcessing: (action: StreamlangProcessorDefinition["action"], processorWithRenames: IngestPipelineProcessor) => IngestProcessorContainer[];
