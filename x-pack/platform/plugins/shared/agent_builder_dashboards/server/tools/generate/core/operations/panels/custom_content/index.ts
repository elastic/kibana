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
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
  customContentStateSchema,
} from '@kbn/custom-content-common';
import { z } from '@kbn/zod/v4';
import { definePanelType } from '../panel_type';

/**
 * Custom content panel logic.
 *
 * Custom content is authored with `source: 'config'` (`type: 'custom_content'`).
 * The agent provides a `prompt` describing what to render and, optionally, a
 * pre-written LiquidJS `template` and an `esqlQuery` for data-backed panels.
 * When no `template` is given the embeddable generates one from the `prompt`
 * on first display. This panel type is a fallback for content that cannot be
 * expressed as a Lens visualization or Vega-Lite chart.
 */

/**
 * By-value custom content panel config. Extends the shared state schema to add
 * agent-facing descriptions and make `prompt` required (so the embeddable always
 * has something to generate from when `template` is omitted).
 */
export const customContentPanelConfigSchema = customContentStateSchema.extend({
  prompt: z
    .string()
    .min(1)
    .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
    .describe(
      'Natural language description of what to display. The embeddable generates an HTML template from this if `template` is omitted.'
    ),
  template: z
    .string()
    .max(CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH)
    .optional()
    .describe(
      'LiquidJS HTML template to render directly. No JavaScript (<script> tags are rejected). When `esqlQuery` is set, each row is accessible as `{{ row["field_name"].value }}`.'
    ),
  esqlQuery: z
    .string()
    .max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)
    .optional()
    .describe(
      'ES|QL query whose results are passed to the template as row objects. Omit for static content.'
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

/**
 * The custom_content variant of an `edit_panels` item: targets an existing
 * custom_content panel by id and replaces its config.
 */
export const editCustomContentPanelConfigInputSchema = customContentPanelConfigInputSchema
  .omit({ grid: true })
  .extend({
    panelId: z.string().max(256).describe('Existing custom_content panel id to update.'),
    config: customContentPanelConfigSchema.describe(
      'New custom content panel config. Fully replaces the existing config.'
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
          error: `Panel "${existingPanel.id}" with type "${existingPanel.type}" cannot be edited as custom content.`,
        },
});
