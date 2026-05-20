import type { CustomToolChoice, InferenceClient, Prompt, PromptVersion, ToolCallOfToolDefinitions } from '@kbn/inference-common';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import type { StreamsClient } from '../../../../lib/streams/client';
/**
 * Extracts the tool call arguments type from a Prompt.
 * This gives us the properly typed arguments from the tool call.
 */
type ToolCallArgumentsOfPrompt<TPrompt extends Prompt> = ToolCallOfToolDefinitions<NonNullable<TPrompt['versions'][number]['tools']>> extends {
    function: {
        arguments: infer TArgs;
    };
} ? TArgs : never;
/**
 * Determines whether OTEL field names should be used for a given stream.
 * Returns true if the stream uses OTel naming conventions (wired non-ECS streams
 * or classic streams matching the logs-*.otel-* pattern).
 */
export declare function determineOtelFieldNameUsage(streamsClient: StreamsClient, streamName: string): Promise<boolean>;
/**
 * Calls the LLM inference API with the provided prompt and input data.
 * Returns the parsed tool call arguments from the response.
 */
export declare function callInferenceWithPrompt<TPrompt extends Prompt<any, Array<Omit<PromptVersion, 'toolChoice'> & {
    toolChoice: CustomToolChoice;
}>>>(inferenceClient: InferenceClient, connectorId: string, prompt: TPrompt, sampleMessages: string[], reviewFields: unknown, signal: AbortSignal): Promise<ToolCallArgumentsOfPrompt<TPrompt>>;
/**
 * Fetches ECS/OTEL field metadata for the provided field names.
 * Returns a dictionary mapping field names to their metadata.
 */
export declare function fetchFieldMetadata(fieldsMetadataClient: IFieldsMetadataClient, ecsFields: string[]): Promise<Record<string, FieldMetadataPlain>>;
/**
 * Normalizes a field name by:
 * 1. Replacing @timestamp with custom.timestamp to avoid format issues
 * 2. Resolving to OTEL field name equivalent if needed
 */
export declare function normalizeFieldName(ecsField: string, fieldMetadata: Record<string, FieldMetadataPlain>, useOtelFieldNames: boolean): string;
export {};
