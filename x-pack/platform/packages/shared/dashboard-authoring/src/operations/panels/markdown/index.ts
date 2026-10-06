/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import { defineConfigPanelKind } from '../panel_kind';

/**
 * Embeddable type of dashboard markdown panels. Mirrors the private
 * dashboard-markdown plugin's constant, which shared packages cannot import.
 */
export const MARKDOWN_EMBEDDABLE_TYPE = 'markdown';

/**
 * Markdown panel logic.
 *
 * Markdown is authored by value: `source: 'config'` (`type: 'markdown'`) whose
 * `config` is passed through to the embeddable unchanged. This module owns the
 * markdown embeddable identity, the by-value config contract, and the
 * `config`-source input schemas.
 */

/**
 * By-value markdown panel config, mirroring the dashboard markdown embeddable's
 * by-value state. `settings` is optional here; the embeddable defaults
 * `open_links_in_new_tab` to `true` when omitted.
 */
export const markdownPanelConfigSchema = z.object({
  content: z.string().max(50000).describe('Markdown text to render in the panel.'),
  settings: z
    .object({
      open_links_in_new_tab: z
        .boolean()
        .optional()
        .describe('Whether links open in a new tab. Defaults to true.'),
    })
    .optional()
    .describe('Optional markdown rendering settings.'),
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

export const markdownPanelKind = defineConfigPanelKind({
  type: 'markdown',
  embeddableType: MARKDOWN_EMBEDDABLE_TYPE,
  label: 'markdown',
  addInputSchema: markdownPanelConfigInputSchema,
  editInputSchema: editMarkdownPanelConfigInputSchema,
});
