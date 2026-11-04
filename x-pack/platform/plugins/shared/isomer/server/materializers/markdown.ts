/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lazySchema, z } from '@kbn/zod';
import type { Materializer } from '../materialize/types';
import { createUnsupportedNode } from '../materialize/unsupported';

export const MARKDOWN_SAVED_OBJECT_TYPE = 'markdown';

/** A Markdown panel's as-code config, by value, and the title its panel shows. */
const markdownConfigSchema = lazySchema(() =>
  z
    .object({
      content: z.string(),
      title: z.string().optional(),
    })
    .loose()
);

export interface MarkdownConfig {
  content: string;
  title?: string;
}

const emptyReason = () =>
  i18n.translate('xpack.isomer.materialize.markdown.empty', {
    defaultMessage: 'This Markdown panel is empty.',
  });

/**
 * Materializes a dashboard Markdown panel, by value or from the Markdown library by ID, into the
 * components pack's `markdown`. The panel's content is GitHub-flavored Markdown already.
 */
export const createMarkdownMaterializer = (): Materializer<MarkdownConfig> => ({
  version: 1,

  parse: (config) => {
    const { content, title } = markdownConfigSchema.parse(config);
    return { content, ...(title ? { title } : {}) };
  },

  load: async (id, { savedObjectsClient }) => {
    const { attributes } = await savedObjectsClient.get<{ content?: unknown; title?: unknown }>(
      MARKDOWN_SAVED_OBJECT_TYPE,
      id
    );
    return attributes;
  },

  describe: ({ title }) => (title ? { title } : {}),

  plan: ({ content, title }) =>
    content.trim() ? [] : createUnsupportedNode(emptyReason(), { title }),

  map: ({ content }) => ({ type: 'markdown', text: content }),
});
