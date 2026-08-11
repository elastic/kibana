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
  CUSTOM_CONTENT_MAX_TEMPLATE_BYTES,
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
  customContentStateSchema,
} from '@kbn/custom-content-common';
import { z } from '@kbn/zod/v4';
import { definePanelType } from '../panel_type';

/** Create schema: no template — the embeddable generates it via the generate route. */
export const customContentPanelConfigSchema = customContentStateSchema
  .omit({ template: true })
  .extend({
    prompt: z
      .string()
      .min(1)
      .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
      .describe(
        'Natural language description of what to display. The embeddable generates a visually consistent HTML template from this prompt using EUI color tokens for the active theme — do not supply a template yourself on create.'
      ),
    esqlQuery: z
      .string()
      .max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)
      .optional()
      .describe(
        'ES|QL query whose results are passed to the generated template as row objects. Omit for static content.'
      ),
  });

/** Edit schema: includes template so the agent can modify the existing generated template. */
const customContentEditConfigSchema = customContentStateSchema.extend({
  prompt: z
    .string()
    .min(1)
    .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
    .describe('Updated natural language description of what to display.'),
  template: z
    .string()
    .max(CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH)
    .check((ctx) => {
      if (Buffer.byteLength(ctx.value, 'utf8') > CUSTOM_CONTENT_MAX_TEMPLATE_BYTES) {
        ctx.issues.push({
          code: 'custom',
          message: `Template exceeds the ${CUSTOM_CONTENT_MAX_TEMPLATE_BYTES}-byte limit.`,
          input: ctx.value,
        });
      }
    })
    .optional()
    .describe(
      'The existing LiquidJS HTML template from the panel state, modified to reflect the requested changes. Carry it over from the current panel config and apply targeted edits — do not rewrite from scratch. Omit only if removing the stored template intentionally so the embeddable regenerates from prompt.'
    ),
  esqlQuery: z
    .string()
    .max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)
    .optional()
    .describe(
      'ES|QL query. Carry over from the existing panel config unless the request changes the data source.'
    ),
});

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
    'Updated config. Carry over prompt, template, and esqlQuery from the existing panel and apply only the requested changes.'
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
