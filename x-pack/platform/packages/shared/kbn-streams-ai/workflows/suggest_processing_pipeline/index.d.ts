import { type BoundInferenceClient } from '@kbn/inference-common';
import type { FlattenRecord, ProcessingSimulationResponse, Streams } from '@kbn/streams-schema';
import { type StreamlangDSL } from '@kbn/streamlang';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type SuggestPipelineAgentSchema } from './schema';
export interface SuggestProcessingPipelineResult {
    pipeline: StreamlangDSL | null;
    metadata: {
        stepsUsed: number;
        maxSteps: number;
    };
}
/**
 * Runs the ingest-pipeline suggestion agent. Callers supply the Zod schema that constrains tool
 * arguments (full vs post-parse-only), sample `documents` that match that mode, and a
 * pre-built **`initialDatasetAnalysisJson`** (document structure overview for the samples in `documents`);
 * any seed grok/dissect step is composed **outside** this function.
 */
export declare function suggestProcessingPipeline({ definition, inferenceClient, agentPipelineSchema, maxSteps, maxDurationMs, signal, simulatePipeline, documents, fieldsMetadataClient, esClient, initialDatasetAnalysisJson, mappedFields, upstreamSeedParsingContextMarkdown, }: {
    definition: Streams.ingest.all.Definition;
    inferenceClient: BoundInferenceClient;
    agentPipelineSchema: SuggestPipelineAgentSchema;
    maxSteps?: number | undefined;
    maxDurationMs?: number | undefined;
    signal: AbortSignal;
    simulatePipeline(pipeline: StreamlangDSL): Promise<ProcessingSimulationResponse>;
    documents: FlattenRecord[];
    fieldsMetadataClient: IFieldsMetadataClient;
    esClient: ElasticsearchClient;
    /** Pre-computed JSON for `initial_dataset_analysis` (field layout / sample values for `documents`). */
    initialDatasetAnalysisJson: string;
    /** Mapped fields from field_caps; callers must fetch before calling. */
    mappedFields: Record<string, string>;
    /**
     * When the caller runs an upstream grok/dissect seed step, pass a formatted description so the model
     * knows parsing already happened. Omit or leave empty when the full processor schema is used.
     */
    upstreamSeedParsingContextMarkdown?: string;
}): Promise<SuggestProcessingPipelineResult>;
export type { SuggestPipelineAgentSchema } from './schema';
export { getPipelineDefinitionJsonSchema, pipelineDefinitionSchema, postParsePipelineDefinitionSchema, } from './schema';
export { mergeSeedParsingProcessorIntoSuggestedPipeline } from './merge_seed_parsing_into_suggested_pipeline';
export { formatUpstreamSeedParsingContextForPromptMarkdown } from './upstream_seed_parsing_prompt';
export { formatZodPipelineErrors } from './format_zod_pipeline_errors';
export { buildSimulationFeedback, detectTemporaryFields, type SimulationFeedback, } from './build_simulation_feedback';
/**
 * Builds a JSON-serializable overview of sample document structure (fields, example values, schema hints)
 * for the pipeline suggestion prompt—no ingest simulation or parse-rate semantics.
 */
export declare function buildDocumentStructureOverviewForPipelinePrompt(documents: FlattenRecord[], fieldsMetadataClient: IFieldsMetadataClient, isOtel: boolean, mappedFields: Record<string, string>): Promise<{
    document_count: number;
    fields: string[];
}>;
/** Field types from the stream index (field_caps); reused for prompt overview + simulate tool metrics. */
export declare function fetchMappedFieldsForStreamProcessingSuggestions(esClient: ElasticsearchClient, streamIndexName: string): Promise<Record<string, string>>;
export declare function buildFieldSummaryLinesFromDocumentValues(documents: FlattenRecord[], fieldsMetadataClient: IFieldsMetadataClient, isOtel: boolean, mappedFields: Record<string, string>): Promise<string[]>;
