import type { z } from '@kbn/zod/v4';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { ReviewFieldsPrompt } from '@kbn/grok-heuristics';
import type { GrokProcessor } from '@kbn/streamlang';
import type { InferenceClient, ToolOptionsOfPrompt } from '@kbn/inference-common';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { ToolCallsOfToolOptions } from '@kbn/inference-common/src/chat_complete/tools_of';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import type { StreamsClient } from '../../../../lib/streams/client';
import type { IPatternExtractionService } from '../../../../lib/pattern_extraction/pattern_extraction_service';
export interface ProcessingGrokSuggestionsParams {
    path: {
        name: string;
    };
    body: {
        connector_id: string;
        field_name: string;
        sample_messages: string[];
    };
}
export interface ProcessingGrokSuggestionsHandlerDeps {
    params: ProcessingGrokSuggestionsParams;
    connectorId: string;
    inferenceClient: InferenceClient;
    scopedClusterClient: IScopedClusterClient;
    streamsClient: StreamsClient;
    fieldsMetadataClient: IFieldsMetadataClient;
    patternExtractionService: IPatternExtractionService;
    signal: AbortSignal;
    logger: Logger;
}
export declare const processingGrokSuggestionsSchema: z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        connector_id: z.ZodString;
        field_name: z.ZodString;
        sample_messages: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
type FieldReviewResults = ToolCallsOfToolOptions<ToolOptionsOfPrompt<typeof ReviewFieldsPrompt>>[number]['function']['arguments']['fields'];
export declare const handleProcessingGrokSuggestions: ({ params, connectorId, inferenceClient, streamsClient, fieldsMetadataClient, patternExtractionService, signal, logger, }: ProcessingGrokSuggestionsHandlerDeps) => Promise<GrokProcessor | null>;
export declare function reviewGrokFields({ streamName, connectorId, fieldName, sampleMessages, reviewFields, inferenceClient, streamsClient, fieldsMetadataClient, signal, }: {
    streamName: string;
    connectorId: string;
    fieldName: string;
    sampleMessages: string[];
    reviewFields: Record<string, {
        grok_component: string;
        example_values: string[];
    }>;
    inferenceClient: InferenceClient;
    streamsClient: StreamsClient;
    fieldsMetadataClient: IFieldsMetadataClient;
    signal: AbortSignal;
}): Promise<{
    log_source: string;
    fields: {
        name: string;
        columns: string[];
        grok_components: string[];
    }[];
}>;
export declare function mapFields(reviewResults: FieldReviewResults, fieldMetadata: Record<string, FieldMetadataPlain>, useOtelFieldNames: boolean, fieldName: string): {
    name: string;
    columns: string[];
    grok_components: string[];
}[];
export {};
