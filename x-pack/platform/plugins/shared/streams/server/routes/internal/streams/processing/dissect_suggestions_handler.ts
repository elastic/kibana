/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { IScopedClusterClient } from '@kbn/core/server';
import { ReviewDissectFieldsPrompt } from '@kbn/dissect-heuristics';
import type { InferenceClient, ToolOptionsOfPrompt } from '@kbn/inference-common';
import { Streams } from '@kbn/streams-schema';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { prefixOTelField } from '@kbn/otel-semantic-conventions';
import type { ToolCallsOfToolOptions } from '@kbn/inference-common/src/chat_complete/tools_of';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import type { StreamsClient } from '../../../../lib/streams/client';

export interface ProcessingDissectSuggestionsParams {
  path: {
    name: string;
  };
  body: {
    connector_id: string;
    sample_messages: string[];
    review_fields: Record<
      string,
      {
        example_values: string[];
        position: number;
      }
    >;
  };
}

export interface ProcessingDissectSuggestionsHandlerDeps {
  params: ProcessingDissectSuggestionsParams;
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  signal: AbortSignal;
}

export const processingDissectSuggestionsSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    connector_id: z.string(),
    sample_messages: z.array(z.string()),
    review_fields: z.record(
      z.string(),
      z.object({
        example_values: z.array(z.string()),
        position: z.number(),
      })
    ),
  }),
}) satisfies z.Schema<ProcessingDissectSuggestionsParams>;

type FieldReviewResults = ToolCallsOfToolOptions<
  ToolOptionsOfPrompt<typeof ReviewDissectFieldsPrompt>
>[number]['function']['arguments']['fields'];

export const handleProcessingDissectSuggestions = async ({
  params,
  inferenceClient,
  streamsClient,
  fieldsMetadataClient,
  signal,
}: ProcessingDissectSuggestionsHandlerDeps) => {
  const stream = await streamsClient.getStream(params.path.name);
  const isWiredStream = Streams.WiredStream.Definition.is(stream);

  const response = await inferenceClient.prompt({
    connectorId: params.body.connector_id,
    prompt: ReviewDissectFieldsPrompt,
    input: {
      sample_messages: params.body.sample_messages,
      review_fields: JSON.stringify(params.body.review_fields),
    },
    abortSignal: signal,
  });
  const reviewResult = response.toolCalls[0].function.arguments;

  // if the stream is wired, or if it matches the logs-*.otel-* pattern, use the OTEL field names
  const useOtelFieldNames = isWiredStream || params.path.name.match(/^logs-.*\.otel-/);

  const fieldMetadata = await fieldsMetadataClient
    .find({
      fieldNames: reviewResult.fields.map((field) => field.ecs_field),
    })
    .then((fieldsDictionary) => fieldsDictionary.toPlain());

  return {
    log_source: reviewResult.log_source,
    fields: mapFields(reviewResult.fields, fieldMetadata, !!useOtelFieldNames),
  };
};

export function mapFields(
  reviewResults: FieldReviewResults,
  fieldMetadata: Record<string, FieldMetadataPlain>,
  useOtelFieldNames: boolean
) {
  return reviewResults.map((field) => {
    // @timestamp is a special case that we want to map to custom.timestamp - if we let it overwrite @timestamp it will most likely
    // fail because the format won't be right. In a follow-up we can extend the suggestion to also add a date format processor step
    // to map it back correctly.
    const name = field.ecs_field.startsWith('@timestamp')
      ? field.ecs_field.replace('@timestamp', 'custom.timestamp')
      : field.ecs_field;
    return {
      // make sure otel field names are translated/prefixed correctly
      ecs_field: useOtelFieldNames
        ? fieldMetadata[name]?.otel_equivalent ?? prefixOTelField(name)
        : name,
      columns: field.columns,
      join_strategy: field.join_strategy,
      is_static: field.is_static,
      static_value: field.static_value,
    };
  });
}
