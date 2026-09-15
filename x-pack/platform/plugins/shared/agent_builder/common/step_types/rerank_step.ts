/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';

/**
 * Step type ID for the rerank workflow step
 */
export const RerankStepTypeId = 'search.rerank';

/**
 * Default values for rerank step parameters
 */
export const RERANK_DEFAULT_RANK_WINDOW_SIZE = 100;
export const RERANK_DEFAULT_MAX_INPUT_FIELD_LENGTH = 1000;
export const RERANK_DEFAULT_MAX_INPUT_TOTAL_LENGTH = 2000;

/**
 * Input schema for the rerank step
 */
const RerankInputSchema = z.object({
  rerank_text: z.string().describe('Text to rerank documents against'),
  data: z.array(z.any()).describe('Array of documents to rerank'),
  fields: z
    .array(z.array(z.string()))
    .optional()
    .describe(
      'Optional field paths to extract from each document for reranking. E.g., [["title"], ["content"], ["user", "name"]] extracts item.title, item.content, and item.user.name'
    ),
  rank_window_size: z
    .number()
    .default(RERANK_DEFAULT_RANK_WINDOW_SIZE)
    .describe(
      `Number of documents from the start of the input array to send for reranking. Limits inference API costs by only reranking the top N documents. Remaining documents are appended to output in their input order. Defaults to ${RERANK_DEFAULT_RANK_WINDOW_SIZE}.`
    ),
  max_input_field_length: z
    .number()
    .default(RERANK_DEFAULT_MAX_INPUT_FIELD_LENGTH)
    .describe(
      `Maximum character length per individual field when extracting fields from documents. Prevents any single field from dominating the text sent to rerank. Defaults to ${RERANK_DEFAULT_MAX_INPUT_FIELD_LENGTH} characters.`
    ),
  max_input_total_length: z
    .number()
    .default(RERANK_DEFAULT_MAX_INPUT_TOTAL_LENGTH)
    .describe(
      `Maximum character length for the total text sent per document to the rerank endpoint. Applied after field extraction and concatenation. Prevents exceeding model token limits. Defaults to ${RERANK_DEFAULT_MAX_INPUT_TOTAL_LENGTH} characters.`
    ),
});

/**
 * Config schema for the rerank step
 * Defines step-level configuration that controls execution behavior
 */
const RerankConfigSchema = z.object({
  inference_id: z
    .string()
    .optional()
    .describe(
      'Rerank inference endpoint ID. If not provided, automatically selects an available rerank endpoint from Elasticsearch, prioritizing Elastic-hosted models over self-hosted Elasticsearch models.'
    ),
});

const RerankOutputSchema = z
  .array(z.any())
  .describe('Array of reranked documents in descending relevance order');

export type RerankInput = z.infer<typeof RerankInputSchema>;
export type RerankConfig = z.infer<typeof RerankConfigSchema>;
export type RerankOutput = z.infer<typeof RerankOutputSchema>;

/**
 * Common step definition for rerank step
 * Shared between server and public implementations
 */
export const rerankStepCommonDefinition: CommonStepDefinition<
  typeof RerankInputSchema,
  typeof RerankOutputSchema,
  typeof RerankConfigSchema
> = {
  id: RerankStepTypeId,
  category: StepCategory.Elasticsearch,
  label: i18n.translate('xpack.agentBuilder.rerankStep.label', {
    defaultMessage: 'Rerank Results',
  }),
  description: i18n.translate('xpack.agentBuilder.rerankStep.description', {
    defaultMessage:
      'Rerank documents using a rerank inference endpoint for improved relevance ordering',
  }),
  documentation: {
    details: i18n.translate('xpack.agentBuilder.rerankStep.documentation.details', {
      defaultMessage: `The rerank step calls a rerank inference endpoint to reorder documents based on relevance to the provided text.

**How it works:**
• Takes an array of documents and rerank text
• Optionally limits reranking to first N documents via rank_window_size parameter (defaults to 100)
• Applies two-level truncation to prevent token limit issues:
  - max_input_field_length: truncates each individual field (defaults to 1000 characters)
  - max_input_total_length: truncates total text per document after concatenation (defaults to 2000 characters)
• Calls the rerank inference endpoint with the rank window
• Returns reranked documents followed by any remaining documents in their input order

**Data handling:**
• If fields parameter provided: extracts fields → truncates each to max_input_field_length → concatenates → truncates to max_input_total_length
• If data contains objects without fields: stringifies → truncates to max_input_total_length
• If data contains strings: passes through → truncates to max_input_total_length
• Always returns original full documents in reranked order

**Inference endpoint selection:**
• If inference_id provided: uses the specified endpoint (can be Elastic-hosted, self-hosted Elasticsearch, or any other rerank endpoint)
• If inference_id omitted: automatically discovers and selects the first available rerank endpoint, prioritizing Elastic-hosted models over self-hosted Elasticsearch models
• At least one rerank inference endpoint must be configured in Elasticsearch

This encapsulates the Elasticsearch rerank API call for easy use in workflows.`,
    }),
    examples: [
      `## Basic usage with rank window
\`\`\`yaml
# Rerank only top 50 results to save on inference costs
- name: rerank_search_results
  type: ${RerankStepTypeId}
  inference_id: "my-rerank-model"
  with:
    rerank_text: "What is the best laptop?"
    data: \${{ steps.search.output }}
    rank_window_size: 50
\`\`\``,
      `## Reranking with field extraction
\`\`\`yaml
# Extract only title and content fields for reranking
# Rerank top 20 from 100 search results
- name: rerank_docs
  type: ${RerankStepTypeId}
  with:
    rerank_text: "{{ inputs.question }}"
    data: \${{ steps.fetch_docs.output }}
    fields:
      - ["title"]
      - ["content"]
    rank_window_size: 20
\`\`\``,
      `## Rerank with default window
\`\`\`yaml
# Omit rank_window_size to use default of 100 documents
- name: rerank_messages
  type: ${RerankStepTypeId}
  inference_id: "my-rerank-model"
  with:
    rerank_text: "Find messages about deployment"
    data: \${{ steps.slack.output }}
    fields:
      - ["user", "name"]
      - ["text"]
\`\`\``,
      `## Rerank with custom truncation limits
\`\`\`yaml
# Limit each field to 500 chars, total concatenated text to 1500 chars
- name: rerank_large_docs
  type: ${RerankStepTypeId}
  inference_id: "my-rerank-model"
  with:
    rerank_text: "Technical documentation about APIs"
    data: \${{ steps.load_docs.output }}
    fields:
      - ["title"]
      - ["description"]
      - ["content"]
    max_input_field_length: 500
    max_input_total_length: 1500
\`\`\``,
    ],
  },
  inputSchema: RerankInputSchema,
  configSchema: RerankConfigSchema,
  outputSchema: RerankOutputSchema,
};
