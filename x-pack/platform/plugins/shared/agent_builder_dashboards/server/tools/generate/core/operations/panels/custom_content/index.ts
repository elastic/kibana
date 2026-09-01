/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
  customContentUpdateSchema,
} from '@kbn/custom-content-common';
import { z } from '@kbn/zod/v4';
import { definePanelType } from '../panel_type';

/** Create schema: no template — the server generates it server-side during the tool call. */
export const customContentPanelConfigSchema = z.object({
  prompt: z
    .string()
    .min(1)
    .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
    .describe(
      'Natural language description of what to display. A visually consistent HTML template is generated server-side from this prompt — do not supply a template yourself.'
    ),
  esqlQuery: z
    .string()
    .max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)
    .optional()
    .describe(
      'ES|QL query whose results are passed to the generated template as row objects. Omit for static content. Build it with the generate_esql tool rather than writing it yourself — the server runs the query to sample its schema and fails the panel if Elasticsearch refuses it.'
    ),
});

export type CustomContentPanelConfig = z.output<typeof customContentPanelConfigSchema>;

/** Edit schema: prompt and esqlQuery only — template is generated server-side. */
const customContentEditConfigSchema = customContentUpdateSchema;

/**
 * The custom_content variant of a `config`-source panel input, discriminated by
 * `type: 'custom_content'`.
 */
export const customContentPanelConfigInputSchema = z.object({
  source: z.literal('config'),
  type: z.literal('custom_content'),
  grid: panelGridSchema,
  config: customContentPanelConfigSchema.describe('Custom content panel config.'),
});

export const editCustomContentPanelConfigInputSchema = z.object({
  source: z.literal('config'),
  type: z.literal('custom_content'),
  panelId: z.string().max(256).describe('Existing custom_content panel id to update.'),
  config: customContentEditConfigSchema.describe(
    'Updated config. Supply only the fields that change. The server refines the existing template based on the merged prompt and esqlQuery — preserving layout and design where possible.'
  ),
});

/** Registry entry for the `custom_content` panel type. */
export const customContentPanelDefinition = definePanelType({
  embeddableType: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  validateConfigEdit: (existingPanel) =>
    existingPanel.type === CUSTOM_CONTENT_EMBEDDABLE_TYPE
      ? { ok: true }
      : {
          ok: false,
          error: `Panel "${existingPanel.id}" with type "${existingPanel.type}" cannot be edited as custom content. Use source: "request" for ES|QL-backed Lens or Vega panels.`,
        },
});
