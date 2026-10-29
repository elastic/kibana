/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MARKDOWN_EMBEDDABLE_TYPE, markdownStateSchema } from '@kbn/dashboard-markdown-schemas';
import { z } from '@kbn/zod/v4';
import { defineConfigPanelKind } from '../panel_kind';

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
 * The markdown variant of `config`-source panel content, discriminated by
 * `type: 'markdown'`.
 */
const markdownPanelContentSchema = z.object({
  source: z.literal('config'),
  type: z.literal('markdown'),
  config: markdownPanelConfigSchema.describe(
    'Markdown panel config (e.g. { content }). On an existing panel, fully replaces its config.'
  ),
});

export const markdownPanelKind = defineConfigPanelKind({
  type: 'markdown',
  embeddableType: MARKDOWN_EMBEDDABLE_TYPE,
  label: 'markdown',
  contentSchema: markdownPanelContentSchema,
});
