/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceClient, Prompt } from '@kbn/inference-common';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { Streams } from '@kbn/streams-schema';
import { prefixOTelField } from '@kbn/otel-semantic-conventions';
import type { StreamsClient } from '../../../../lib/streams/client';

export interface CommonSuggestionHandlerDeps {
  params: {
    path: {
      name: string;
    };
    body: {
      connector_id: string;
      sample_messages: string[];
      review_fields: unknown;
    };
  };
  inferenceClient: InferenceClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  signal: AbortSignal;
}

export interface CommonSuggestionHandlerConfig<TFieldResult, TMappedField> {
  prompt: Prompt;
  extractReviewFields: (reviewFields: unknown) => string;
  mapFieldResult: (
    field: TFieldResult,
    name: string,
    useOtelFieldNames: boolean,
    fieldMetadata: Record<string, FieldMetadataPlain>
  ) => TMappedField;
}

interface ReviewResult<TFieldResult> {
  log_source: string;
  fields: Array<TFieldResult & { ecs_field: string }>;
}

/**
 * Common handler for processing pattern suggestions (grok, dissect, etc.)
 * This extracts the shared logic for calling LLM, fetching field metadata,
 * and mapping field names to ECS/OTEL equivalents.
 */
export async function handleProcessingSuggestions<TFieldResult, TMappedField>(
  config: CommonSuggestionHandlerConfig<TFieldResult, TMappedField>,
  deps: CommonSuggestionHandlerDeps
): Promise<{
  log_source: string;
  fields: TMappedField[];
}> {
  // 1. Get stream and determine whether to use OTEL field names
  const stream = await deps.streamsClient.getStream(deps.params.path.name);
  const isWiredStream = Streams.WiredStream.Definition.is(stream);
  const useOtelFieldNames = isWiredStream || deps.params.path.name.match(/^logs-.*\.otel-/);

  // 2. Call LLM inference with the appropriate prompt
  const response = await deps.inferenceClient.prompt({
    connectorId: deps.params.body.connector_id,
    prompt: config.prompt,
    input: {
      sample_messages: deps.params.body.sample_messages,
      review_fields: config.extractReviewFields(deps.params.body.review_fields),
    },
    abortSignal: deps.signal,
  });

  // Access toolCalls from the response - it exists on ChatCompleteResponse
  if (!('toolCalls' in response)) {
    throw new Error('Expected toolCalls in LLM response');
  }
  const reviewResult = response.toolCalls[0].function.arguments as ReviewResult<TFieldResult>;

  // 3. Fetch field metadata for ECS/OTEL field name resolution
  const fieldMetadata = await deps.fieldsMetadataClient
    .find({
      fieldNames: reviewResult.fields.map((field) => field.ecs_field),
    })
    .then((fieldsDictionary) => fieldsDictionary.toPlain());

  // 4. Map fields with special handling for @timestamp and OTEL field names
  return {
    log_source: reviewResult.log_source,
    fields: reviewResult.fields.map((field) => {
      // @timestamp is a special case - map to custom.timestamp to avoid format issues
      const name = field.ecs_field.startsWith('@timestamp')
        ? field.ecs_field.replace('@timestamp', 'custom.timestamp')
        : field.ecs_field;

      return config.mapFieldResult(field, name, !!useOtelFieldNames, fieldMetadata);
    }),
  };
}

/**
 * Helper to resolve field name to OTEL equivalent when needed
 */
export function resolveFieldName(
  name: string,
  useOtelFieldNames: boolean,
  fieldMetadata: Record<string, FieldMetadataPlain>
): string {
  return useOtelFieldNames ? fieldMetadata[name]?.otel_equivalent ?? prefixOTelField(name) : name;
}
