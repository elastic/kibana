/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { IScopedClusterClient } from '@kbn/core/server';
import { ReviewFieldsPrompt } from '@kbn/grok-heuristics';
import type { InferenceClient } from '@kbn/inference-common';
import { Streams } from '@kbn/streams-schema';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { prefixOTelField } from '@kbn/otel-semantic-conventions';
import type { StreamsClient } from '../../../../lib/streams/client';

export interface ProcessingGrokSuggestionsParams {
  path: {
    name: string;
  };
  body: {
    connector_id: string;
    sample_messages: string[];
    review_fields: Record<
      string,
      {
        grok_component: string;
        example_values: string[];
      }
    >;
  };
}

export interface ProcessingGrokSuggestionsHandlerDeps {
  params: ProcessingGrokSuggestionsParams;
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
}

export const processingGrokSuggestionsSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    connector_id: z.string(),
    sample_messages: z.array(z.string()),
    review_fields: z.record(
      z.string(),
      z.object({
        grok_component: z.string(),
        example_values: z.array(z.string()),
      })
    ),
  }),
}) satisfies z.Schema<ProcessingGrokSuggestionsParams>;

export const handleProcessingGrokSuggestions = async ({
  params,
  inferenceClient,
  streamsClient,
  fieldsMetadataClient,
}: ProcessingGrokSuggestionsHandlerDeps) => {
  const stream = await streamsClient.getStream(params.path.name);
  const isWiredStream = Streams.WiredStream.Definition.is(stream);

  const response = await inferenceClient.prompt({
    connectorId: params.body.connector_id,
    prompt: ReviewFieldsPrompt,
    input: {
      sample_messages: params.body.sample_messages,
      review_fields: JSON.stringify(params.body.review_fields),
    },
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
    fields: reviewResult.fields.map((field) => {
      const name = field.ecs_field.startsWith('@timestamp')
        ? field.ecs_field.replace('@timestamp', 'custom.timestamp')
        : field.ecs_field;
      return {
        name: useOtelFieldNames
          ? fieldMetadata[field.ecs_field]?.otel_equivalent ?? prefixOTelField(name)
          : name,
        columns: field.columns,
        grok_components: field.grok_components,
      };
    }),
  };
};
