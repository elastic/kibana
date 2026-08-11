/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import {
  ReviewDissectFieldsPrompt,
  getReviewFields as getDissectReviewFields,
  getDissectProcessorWithReview,
} from '@kbn/dissect-heuristics';
import type { DissectProcessor } from '@kbn/streamlang';
import type { InferenceClient, ToolOptionsOfPrompt } from '@kbn/inference-common';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { ToolCallsOfToolOptions } from '@kbn/inference-common/src/chat_complete/tools_of';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import type { StreamsClient } from '../../../../lib/streams/client';
import type { IPatternExtractionService } from '../../../../lib/pattern_extraction/pattern_extraction_service';
import {
  determineOtelFieldNameUsage,
  callInferenceWithPrompt,
  fetchFieldMetadata,
  normalizeFieldName,
} from './common_processing_helpers';

const MAX_REVIEW_MESSAGES = 10;
const NUM_REVIEW_EXAMPLES = 10;

export interface ProcessingDissectSuggestionsParams {
  path: {
    name: string;
  };
  body: {
    connector_id: string;
    field_name: string;
    sample_messages: string[];
  };
}

export interface ProcessingDissectSuggestionsHandlerDeps {
  params: ProcessingDissectSuggestionsParams;
  connectorId: string;
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  patternExtractionService: IPatternExtractionService;
  signal: AbortSignal;
  logger: Logger;
}

export const processingDissectSuggestionsSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    connector_id: z.string(),
    field_name: z.string(),
    sample_messages: z.array(z.string()),
  }),
}) satisfies z.Schema<ProcessingDissectSuggestionsParams>;

type FieldReviewResults = ToolCallsOfToolOptions<
  ToolOptionsOfPrompt<typeof ReviewDissectFieldsPrompt>
>[number]['function']['arguments']['fields'];

export const handleProcessingDissectSuggestions = async ({
  params,
  connectorId,
  inferenceClient,
  streamsClient,
  fieldsMetadataClient,
  patternExtractionService,
  signal,
  logger,
}: ProcessingDissectSuggestionsHandlerDeps): Promise<DissectProcessor | null> => {
  const { name: streamName } = params.path;

  logger.debug(
    `Starting extraction (stream=${streamName} messages=${params.body.sample_messages.length} connectorId=${connectorId})`
  );

  const { dissectPattern, largestGroupMessages } =
    await patternExtractionService.extractDissectPattern(params.body.sample_messages);

  logger.debug(
    `Extraction complete (stream=${streamName} astNodes=${dissectPattern.ast.nodes.length}` +
      ` fields=${dissectPattern.fields.length} largestGroupMessages=${largestGroupMessages.length})`
  );

  if (!dissectPattern.ast.nodes.length) {
    logger.debug(`Empty AST, returning null (stream=${streamName})`);
    return null;
  }

  const reviewFields = getDissectReviewFields(dissectPattern, NUM_REVIEW_EXAMPLES);
  logger.debug(
    `LLM review request (stream=${streamName} fields=${
      Object.keys(reviewFields).length
    } positions=${Object.values(reviewFields)
      .map((f) => f.position)
      .join(',')})`
  );

  const reviewResult = await reviewDissectFields({
    streamName,
    connectorId,
    fieldName: params.body.field_name,
    sampleMessages: largestGroupMessages.slice(0, MAX_REVIEW_MESSAGES),
    reviewFields,
    inferenceClient,
    streamsClient,
    fieldsMetadataClient,
    signal,
  });

  logger.debug(
    `LLM review result (stream=${streamName} log_source=${reviewResult.log_source} fields=${
      reviewResult.fields.length
    } fieldNames=${reviewResult.fields.map((f: { ecs_field: string }) => f.ecs_field).join(',')})`
  );

  const result = getDissectProcessorWithReview(
    dissectPattern,
    reviewResult,
    params.body.field_name
  );

  if (!result.pattern || result.pattern.trim().length === 0) {
    logger.debug(`Empty pattern after review, returning null (stream=${streamName})`);
    return null;
  }

  const processor: DissectProcessor = {
    action: 'dissect',
    from: params.body.field_name,
    pattern: result.pattern,
    append_separator: result.processor.dissect.append_separator,
    description: result.description,
  };

  logger.debug(
    `Assembled processor (stream=${streamName} patternLength=${
      processor.pattern.length
    } appendSeparator=${processor.append_separator ?? 'none'})`
  );

  return processor;
};

export async function reviewDissectFields({
  streamName,
  connectorId,
  fieldName,
  sampleMessages,
  reviewFields,
  inferenceClient,
  streamsClient,
  fieldsMetadataClient,
  signal,
}: {
  streamName: string;
  connectorId: string;
  fieldName: string;
  sampleMessages: string[];
  reviewFields: Record<string, { example_values: string[]; position: number }>;
  inferenceClient: InferenceClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  signal: AbortSignal;
}) {
  // Determine if we should use OTEL field names
  const useOtelFieldNames = await determineOtelFieldNameUsage(streamsClient, streamName);

  // Call LLM inference to review fields
  const reviewResult = await callInferenceWithPrompt(
    inferenceClient,
    connectorId,
    ReviewDissectFieldsPrompt,
    sampleMessages,
    reviewFields,
    signal
  );

  // Fetch field metadata for ECS/OTEL field name resolution
  const fieldMetadata = await fetchFieldMetadata(
    fieldsMetadataClient,
    reviewResult.fields.map((field: { ecs_field: string }) => field.ecs_field)
  );

  return {
    log_source: reviewResult.log_source,
    fields: mapFields(reviewResult.fields, fieldMetadata, useOtelFieldNames, fieldName),
  };
}

export function mapFields(
  reviewResults: FieldReviewResults,
  fieldMetadata: Record<string, FieldMetadataPlain>,
  useOtelFieldNames: boolean,
  fieldName: string
) {
  return reviewResults.map((field) => {
    // The LLM always uses "message" as the catch-all content field. Replace it with the actual
    // target field name (e.g. "error.message" on ECS streams or "body.text" on OTel streams).
    if (field.ecs_field === 'message') {
      return { ecs_field: fieldName, columns: field.columns };
    }
    const ecsField = normalizeFieldName(field.ecs_field, fieldMetadata, useOtelFieldNames);
    return {
      ecs_field: ecsField,
      columns: field.columns,
    };
  });
}
