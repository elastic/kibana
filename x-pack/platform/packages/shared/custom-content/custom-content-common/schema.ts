/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
} from './constants';

/**
 * Persisted content of a custom content panel. No `prompt`: on an edit the prompt is a delta
 * ("remove the background color"), not a description, so the template is the source of truth.
 */
export const customContentStateSchema = z.object({
  esqlQuery: z.string().max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH).optional(),
  template: z.string().max(CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH).optional(),
});

export type CustomContentState = z.output<typeof customContentStateSchema>;

/**
 * Generation input for the create-panel and update-panel tools. `prompt` instructs this operation
 * only and is never persisted; the server generates `template`.
 */
export const customContentUpdateSchema = z
  .object({
    embeddable_id: z
      .string()
      .min(1)
      .max(100)
      .describe(
        'The embeddable_id of the custom content panel to update. It is shown in the panel context header (e.g. "Custom content panel (embeddable_id: …)"). Required when multiple panels are present in the conversation so the tool can target the correct one.'
      ),
    prompt: z
      .string()
      .min(1)
      .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
      .optional()
      .describe(
        'Natural language instruction for what to create or change. The server generates the HTML template from this prompt.'
      ),
    esqlQuery: z
      .string()
      .max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)
      .nullable()
      .optional()
      .describe(
        'ES|QL query. Omit to keep the existing query. Pass null to remove it entirely. Build it with the generate_esql tool rather than writing it yourself — the server runs the query to sample its schema and rejects the whole operation if Elasticsearch refuses it.'
      ),
  })
  .refine(({ prompt, esqlQuery }) => prompt !== undefined || esqlQuery !== undefined, {
    message: 'At least one of prompt or esqlQuery must be provided.',
  });

export type CustomContentUpdate = z.output<typeof customContentUpdateSchema>;
