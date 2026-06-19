/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Home for markdown panel logic.
 *
 * Markdown is authored as a `panelConfig` (`type: 'markdown'`) whose `config` is
 * passed through to the embeddable unchanged, exactly like a Lens `panelConfig`.
 * This module owns the markdown embeddable-type identity and the markdown
 * by-value config contract, and is the place for future markdown-specific
 * behavior (e.g. a markdown generation prompt that authors the content).
 */
export { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';

/**
 * By-value markdown panel config, mirroring the dashboard markdown embeddable's
 * by-value state. `settings` is optional here; the embeddable defaults
 * `open_links_in_new_tab` to `true` when omitted.
 */
export const markdownPanelConfigSchema = z.object({
  content: z.string().describe('Markdown text to render in the panel.'),
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

export type MarkdownPanelConfig = z.infer<typeof markdownPanelConfigSchema>;
