/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { ReviewFieldsPrompt, assembleGrokProcessor } from '@kbn/grok-heuristics';
import type { GrokProcessor } from '@kbn/streamlang';
import type { InferenceClient, ToolOptionsOfPrompt } from '@kbn/inference-common';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { ToolCallsOfToolOptions } from '@kbn/inference-common/src/chat_complete/tools_of';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { isOtelStream } from '@kbn/streams-schema';
import type { StreamsClient } from '../../../../lib/streams/client';
import type { IPatternExtractionService } from '../../../../lib/pattern_extraction/pattern_extraction_service';
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
    field_name: string;
    sample_messages: string[];
  };
}

export interface ProcessingGrokSuggestionsHandlerDeps {
  params: ProcessingGrokSuggestionsParams;
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  patternExtractionService: IPatternExtractionService;
  signal: AbortSignal;
  logger: Logger;
}

export const processingGrokSuggestionsSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    connector_id: z.string(),
    field_name: z.string(),
    sample_messages: z.array(z.string()),
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
  patternExtractionService,
  signal,
  logger,
}: ProcessingGrokSuggestionsHandlerDeps): Promise<GrokProcessor | null> => {
  const { name: streamName } = params.path;
  const { connector_id: connectorId } = params.body;

  logger.debug(
    `Starting extraction (stream=${streamName} messages=${params.body.sample_messages.length} connectorId=${connectorId})`
  );

  const { patternGroups } = await patternExtractionService.extractGrokPatterns(
    params.body.sample_messages
  );

  logger.debug(`Extraction complete (stream=${streamName} patternGroups=${patternGroups.length})`);

  if (patternGroups.length === 0) {
    logger.debug(`No pattern groups found, returning null (stream=${streamName})`);
    return null;
  }

  for (const [i, group] of patternGroups.entries()) {
    logger.debug(
      `Pattern group ${i + 1}/${patternGroups.length}` +
        ` (stream=${streamName} messages=${group.messages.length} nodes=${group.nodes.length})`
    );
  }

  const result = await assembleGrokProcessor({
    from: params.body.field_name,
    patternGroups,
    reviewFn: async (reviewFields, messages) => {
      logger.debug(
        `LLM review request (stream=${streamName} messages=${messages.length} fields=${
          Object.keys(reviewFields).length
        } components=${Object.values(reviewFields)
          .map((f) => f.grok_component)
          .join(',')})`
      );
      const reviewResult = await reviewGrokFields({
        streamName,
        connectorId,
        fieldName: params.body.field_name,
        sampleMessages: messages,
        reviewFields,
        inferenceClient,
        streamsClient,
        fieldsMetadataClient,
        signal,
      });
      logger.debug(
        `LLM review result (stream=${streamName} log_source=${reviewResult.log_source} fields=${
          reviewResult.fields.length
        } fieldNames=${reviewResult.fields.map((f) => f.name).join(',')})`
      );
      return reviewResult;
    },
  });

  if (result) {
    logger.debug(
      `Assembled processor (stream=${streamName} patterns=${
        result.patterns.length
      } patternDefinitions=${Object.keys(result.pattern_definitions ?? {}).length})`
    );
  } else {
    logger.debug(`Assembly returned null (stream=${streamName})`);
  }

  return result;
};

export async function reviewGrokFields({
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
  reviewFields: Record<string, { grok_component: string; example_values: string[] }>;
  inferenceClient: InferenceClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  signal: AbortSignal;
}) {
  const stream = await streamsClient.getStream(streamName);
  const useOtelFieldNames = isOtelStream(stream);

  // Call LLM inference to review fields
  const reviewResult = await callInferenceWithPrompt(
    inferenceClient,
    connectorId,
    ReviewFieldsPrompt,
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
      return { name: fieldName, columns: field.columns, grok_components: field.grok_components };
    }
    const name = normalizeFieldName(field.ecs_field, fieldMetadata, useOtelFieldNames);
    return {
      name,
      columns: field.columns,
      grok_components: field.grok_components,
    };
  });
}
