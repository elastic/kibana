/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ReviewDissectFieldsPrompt } from '@kbn/dissect-heuristics';
import type { ToolCallsOfToolOptions } from '@kbn/inference-common/src/chat_complete/tools_of';
import type { ToolOptionsOfPrompt } from '@kbn/inference-common';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import {
  handleProcessingSuggestions,
  resolveFieldName,
  type CommonSuggestionHandlerDeps,
} from './common_suggestions_handler';

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

export type ProcessingDissectSuggestionsHandlerDeps = CommonSuggestionHandlerDeps;

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

export const handleProcessingDissectSuggestions = async (
  deps: ProcessingDissectSuggestionsHandlerDeps
) => {
  return handleProcessingSuggestions(
    {
      prompt: ReviewDissectFieldsPrompt,
      extractReviewFields: (reviewFields) => JSON.stringify(reviewFields),
      mapFieldResult: (
        field: FieldReviewResults[number],
        name,
        useOtelFieldNames,
        fieldMetadata
      ) => ({
        ecs_field: resolveFieldName(name, useOtelFieldNames, fieldMetadata),
        columns: field.columns,
        join_strategy: field.join_strategy,
        is_static: field.is_static,
        static_value: field.static_value,
      }),
    },
    deps
  );
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
      ecs_field: resolveFieldName(name, useOtelFieldNames, fieldMetadata),
      columns: field.columns,
      join_strategy: field.join_strategy,
      is_static: field.is_static,
      static_value: field.static_value,
    };
  });
}
