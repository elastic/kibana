/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MarkdownNode } from '@kbn/agent-builder-common/attachments';
import { definePrimitive, definePrimitivePack, requiredString, z } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';

const markdown = definePrimitive<MarkdownNode>({
  type: 'markdown',
  schema: z.object({
    type: z.literal('markdown'),
    text: requiredString().describe('GitHub-flavored markdown'),
  }),
  catalog: {
    type: 'markdown',
    purpose: 'A block of prose in GitHub-flavored markdown.',
    useWhen: ['The message is text: paragraphs, lists, links, code or tables.'],
    avoidWhen: [],
    example: { type: 'markdown', text: 'There are **3** open alerts.' },
  },
  examples: [{ type: 'markdown', text: 'There are **3** open alerts.' }],
  renderers: {
    react: ({ text }) => text,
    text: ({ text }) => text,
    markdown: ({ text }) => md.authored(text),
  },
});

/**
 * The node types of an Agent Builder composition. Shared by the server and the browser, so a
 * primitive must only import what runs on both.
 */
export const agentBuilderPack = definePrimitivePack({
  id: 'agent-builder',
  primitives: [markdown],
});
