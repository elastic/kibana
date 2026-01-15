/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { ReviewFieldsPrompt } from '@kbn/grok-heuristics';
import type { InferenceClient, ToolOptionsOfPrompt } from '@kbn/inference-common';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { ToolCallsOfToolOptions } from '@kbn/inference-common/src/chat_complete/tools_of';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { isOtelStream } from '@kbn/streams-schema';
import type { StreamsClient } from '../../../../lib/streams/client';
import {
  callInferenceWithPrompt,
  fetchFieldMetadata,
  normalizeFieldName,
} from './common_processing_helpers';

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
  signal: AbortSignal;
  logger: Logger;
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

type FieldReviewResults = ToolCallsOfToolOptions<
  ToolOptionsOfPrompt<typeof ReviewFieldsPrompt>
>[number]['function']['arguments']['fields'];

export const handleProcessingGrokSuggestions = async ({
  params,
  inferenceClient,
  streamsClient,
  fieldsMetadataClient,
  signal,
  logger,
}: ProcessingGrokSuggestionsHandlerDeps) => {
  const stream = await streamsClient.getStream(params.path.name);

  // Call LLM inference to review fields
  const reviewResult = await callInferenceWithPrompt(
    inferenceClient,
    params.body.connector_id,
    ReviewFieldsPrompt,
    params.body.sample_messages,
    params.body.review_fields,
    signal
  );

  // Fetch field metadata for ECS/OTEL field name resolution
  const fieldMetadata = await fetchFieldMetadata(
    fieldsMetadataClient,
    reviewResult.fields.map((field: { ecs_field: string }) => field.ecs_field)
  );

  return {
    log_source: reviewResult.log_source,
    fields: mapFields(reviewResult.fields, fieldMetadata, isOtelStream(stream)),
  };
};

export function mapFields(
  reviewResults: FieldReviewResults,
  fieldMetadata: Record<string, FieldMetadataPlain>,
  useOtelFieldNames: boolean
) {
  return reviewResults.map((field) => {
    const name = normalizeFieldName(field.ecs_field, fieldMetadata, useOtelFieldNames);
    return {
      name,
      columns: field.columns,
      grok_components: field.grok_components,
    };
  });
}
