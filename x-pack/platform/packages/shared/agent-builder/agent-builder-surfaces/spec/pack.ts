/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import {
  buildAuthoringJsonSchema,
  composePacks,
  definePrimitive,
  definePrimitivePack,
  requiredString,
  z,
} from '@elastic/isomer-sdk';

export interface MarkdownNode extends PrimitiveNode {
  type: 'markdown';
  text: string;
}

const markdown = definePrimitive<MarkdownNode>({
  type: 'markdown',
  schema: z.object({
    type: z.literal('markdown'),
    text: requiredString().describe('GitHub-flavored markdown'),
  }),
  catalog: {
    type: 'markdown',
    purpose: 'A block of prose in GitHub-flavored markdown.',
    useWhen: ['The reply is text: paragraphs, lists, links, code or tables.'],
    avoidWhen: [],
    example: { type: 'markdown', text: 'There are **3** open alerts.' },
  },
  examples: [{ type: 'markdown', text: 'There are **3** open alerts.' }],
  renderers: {
    react: ({ text }) => text,
    text: ({ text }) => text,
    markdown: ({ text }) => text,
  },
});

/** The node types an Agent Builder spec may use. */
export const agentBuilderPack = definePrimitivePack({
  id: 'agent-builder',
  primitives: [markdown],
});

/** The pack's definitions, held once so Isomer's per-array schema caches are reused. */
export const specDefinitions = composePacks([agentBuilderPack]).definitions;

/** JSON Schema of a spec, slimmed down for the agent to read. */
export const specAuthoringSchema = buildAuthoringJsonSchema(specDefinitions);
