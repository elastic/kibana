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

/** Zod schema for the content-only fields of a custom content panel. */
export const customContentStateSchema = z.object({
  prompt: z.string().max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH).optional(),
  esqlQuery: z.string().max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH).optional(),
  template: z.string().max(CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH).optional(),
});

export type CustomContentState = z.output<typeof customContentStateSchema>;

/**
 * Shared schema for custom content panel update operations (create-panel tool and
 * update-panel tool). Omits `template` — the server generates it from `prompt`.
 */
export const customContentUpdateSchema = customContentStateSchema
  .omit({ template: true })
  .extend({
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
      .describe('ES|QL query. Omit to keep the existing query. Pass null to remove it entirely.'),
  })
  .refine(({ prompt, esqlQuery }) => prompt !== undefined || esqlQuery !== undefined, {
    message: 'At least one of prompt or esqlQuery must be provided.',
  });

export type CustomContentUpdate = z.output<typeof customContentUpdateSchema>;
