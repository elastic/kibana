/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import { MARKDOWN_EMBEDDABLE_TYPE, markdownStateSchema } from '@kbn/dashboard-markdown-schemas';
import { z } from '@kbn/zod/v4';
import type { ConfigPanelTypeDefinition } from '../config_panel_type';

/**
 * Markdown panel logic.
 *
 * Markdown is authored by value: `source: 'config'` (`type: 'markdown'`) whose
 * `config` is passed through to the embeddable unchanged. This module owns the
 * `config`-source input schemas.
 */

/** By-value markdown panel config: the embeddable's markdown state, with bounded `content`. */
const markdownPanelConfigSchema = markdownStateSchema.extend({
  content: markdownStateSchema.shape.content.max(50000),
});

/**
 * The markdown variant of a `config`-source panel input, discriminated by
 * `type: 'markdown'`.
 */
export const markdownPanelConfigInputSchema = z.object({
  source: z.literal('config'),
  type: z.literal('markdown'),
  grid: panelGridSchema,
  config: markdownPanelConfigSchema.describe('Markdown panel config (e.g. { content }).'),
});

/**
 * The markdown variant of an `edit_panels` item: targets an existing markdown
 * panel by id and replaces its config. Derived from the add schema so the
 * `source`/`type`/`config` shape stays in sync.
 */
export const editMarkdownPanelConfigInputSchema = markdownPanelConfigInputSchema
  .omit({ grid: true })
  .extend({
    panelId: z.string().max(256).describe('Existing markdown panel id to update.'),
    config: markdownPanelConfigSchema.describe(
      'New markdown panel config (e.g. { content }). Fully replaces the existing config.'
    ),
  });

/** Registry entry for the `markdown` by-value panel type. */
export const markdownPanelDefinition: ConfigPanelTypeDefinition = {
  embeddableType: MARKDOWN_EMBEDDABLE_TYPE,
  label: 'markdown',
};
