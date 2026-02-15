/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CustomToolChoice,
  InferenceClient,
  Prompt,
  PromptVersion,
  ToolCallOfToolDefinitions,
} from '@kbn/inference-common';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { Streams } from '@kbn/streams-schema';
import { prefixOTelField } from '@kbn/otel-semantic-conventions';
import type { StreamsClient } from '../../../../lib/streams/client';
import { NoLLMSuggestionsError } from './no_llm_suggestions_error';

/**
 * Extracts the tool call arguments type from a Prompt.
 * This gives us the properly typed arguments from the tool call.
 */
type ToolCallArgumentsOfPrompt<TPrompt extends Prompt> = ToolCallOfToolDefinitions<
  NonNullable<TPrompt['versions'][number]['tools']>
> extends {
  function: { arguments: infer TArgs };
}
  ? TArgs
  : never;

/**
 * Determines whether OTEL field names should be used for a given stream.
 * Returns true if the stream is a wired stream or matches the logs-*.otel-* pattern.
 */
export async function determineOtelFieldNameUsage(
  streamsClient: StreamsClient,
  streamName: string
): Promise<boolean> {
  const stream = await streamsClient.getStream(streamName);
  const isWiredStream = Streams.WiredStream.Definition.is(stream);
  return isWiredStream || !!streamName.match(/^logs-.*\.otel-/);
}

/**
 * Calls the LLM inference API with the provided prompt and input data.
 * Returns the parsed tool call arguments from the response.
 */
export async function callInferenceWithPrompt<
  TPrompt extends Prompt<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    Array<Omit<PromptVersion, 'toolChoice'> & { toolChoice: CustomToolChoice }>
  >
>(
  inferenceClient: InferenceClient,
  connectorId: string,
  prompt: TPrompt,
  sampleMessages: string[],
  reviewFields: unknown,
  signal: AbortSignal
) {
  const response = await inferenceClient.prompt({
    connectorId,
    prompt,
    input: {
      sample_messages: sampleMessages,
      review_fields: JSON.stringify(reviewFields),
    },
    abortSignal: signal,
  });

  if (!('toolCalls' in response) || response.toolCalls.length === 0) {
    throw new NoLLMSuggestionsError();
  }

  const toolCall = response.toolCalls[0] as {
    function: { arguments: ToolCallArgumentsOfPrompt<TPrompt> };
  };

  return toolCall.function.arguments;
}

/**
 * Fetches ECS/OTEL field metadata for the provided field names.
 * Returns a dictionary mapping field names to their metadata.
 */
export async function fetchFieldMetadata(
  fieldsMetadataClient: IFieldsMetadataClient,
  ecsFields: string[]
): Promise<Record<string, FieldMetadataPlain>> {
  return fieldsMetadataClient
    .find({
      fieldNames: ecsFields,
    })
    .then((fieldsDictionary) => fieldsDictionary.toPlain());
}

/**
 * Normalizes a field name by:
 * 1. Replacing @timestamp with custom.timestamp to avoid format issues
 * 2. Resolving to OTEL field name equivalent if needed
 */
export function normalizeFieldName(
  ecsField: string,
  fieldMetadata: Record<string, FieldMetadataPlain>,
  useOtelFieldNames: boolean
): string {
  // @timestamp is a special case that we want to map to custom.timestamp - if we let it overwrite @timestamp it will most likely
  // fail because the format won't be right. In a follow-up we can extend the suggestion to also add a date format processor step
  // to map it back correctly.
  const name = ecsField.startsWith('@timestamp')
    ? ecsField.replace('@timestamp', 'custom.timestamp')
    : ecsField;

  // Make sure otel field names are translated/prefixed correctly
  return useOtelFieldNames ? fieldMetadata[name]?.otel_equivalent ?? prefixOTelField(name) : name;
}
