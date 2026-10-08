/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import type { IsomerMarkdownNode } from '@kbn/agent-builder-server/attachments';
import {
  composePacks,
  createPrimitiveDispatcher,
  definePrimitive,
  definePrimitivePack,
  requiredString,
  z,
} from '@elastic/isomer-sdk';

/**
 * A `<render_attachment>` tag of the response message. `version` is absent when the tag has none.
 */
export interface AttachmentNode extends PrimitiveNode {
  type: 'attachment';
  attachmentId: string;
  version?: number;
}

export type CompositionNode = IsomerMarkdownNode | AttachmentNode;

/** A response message as an Isomer composition. */
export type MessageComposition = Composition<CompositionNode>;

const markdown = definePrimitive<IsomerMarkdownNode>({
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
    markdown: ({ text }) => text,
  },
});

const describeAttachment = ({ attachmentId }: AttachmentNode) => `Attachment ${attachmentId}`;

/**
 * Attachment nodes are resolved by `buildComposition` before rendering, so these renderers only name
 * the attachment.
 */
const attachment = definePrimitive<AttachmentNode>({
  type: 'attachment',
  schema: z.object({
    type: z.literal('attachment'),
    attachmentId: requiredString().describe('Id of the conversation attachment'),
    version: z.number().int().positive().optional().describe('Version of the attachment'),
  }),
  catalog: {
    type: 'attachment',
    purpose: 'A conversation attachment, rendered through its type.',
    useWhen: ['The message shows an attachment.'],
    avoidWhen: [],
    example: { type: 'attachment', attachmentId: 'attachment-1', version: 1 },
  },
  examples: [{ type: 'attachment', attachmentId: 'attachment-1', version: 1 }],
  renderers: {
    react: describeAttachment,
    text: describeAttachment,
    markdown: describeAttachment,
  },
});

/** The node types of an Agent Builder composition. */
export const agentBuilderPack = definePrimitivePack({
  id: 'agent-builder',
  primitives: [markdown, attachment],
});

/** Renders compositions on any surface. */
export const compositionDispatcher = createPrimitiveDispatcher<CompositionNode>(
  composePacks([agentBuilderPack]).definitions
);
