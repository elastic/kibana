/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import {
  composePacks,
  createPrimitiveDispatcher,
  definePrimitive,
  definePrimitivePack,
  requiredString,
  z,
} from '@elastic/isomer-sdk';

export interface MarkdownNode extends PrimitiveNode {
  type: 'markdown';
  text: string;
}

export type SpecNode = MarkdownNode;

/** A reply as an Isomer composition. */
export type Spec = Composition<SpecNode>;

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

/** The node types of an Agent Builder spec. */
export const agentBuilderPack = definePrimitivePack({
  id: 'agent-builder',
  primitives: [markdown],
});

/** Renders specs on any surface. */
export const specDispatcher = createPrimitiveDispatcher<SpecNode>(
  composePacks([agentBuilderPack]).definitions
);
