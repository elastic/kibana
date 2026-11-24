/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { slackContainer } from '@elastic/isomer-sdk/slack';

import { componentIcon, definePrimitive, oneLine, plainText } from '../../lib';
import type { DividerNode } from '../divider';
import type { MarkdownNode } from '../markdown';
import type { QuoteNode } from '../quote';
import { sectionReactRenderer } from './section_react';

const sectionSchema = z.object({
  type: z.literal('section'),
  title: plainText(150).describe('The section label, in plain text, such as "Impact".'),
  collapsible: z.boolean().optional().describe('Whether Slack lets the reader collapse it.'),
  body: z.array(unresolvedBodyNodeSchema).min(1).describe('The section content, in order.'),
});

/** A labeled section: a title over the content it groups. */
export interface SectionNode extends PrimitiveNode {
  type: 'section';
  title: string;
  collapsible?: boolean;
  body: readonly PrimitiveNode[];
}

/** The depth of a level 3 `header`, which a section replaces as a label. */
const TITLE_DEPTH = 4;

const impact: MarkdownNode = {
  type: 'markdown',
  text: 'Checkout latency doubled for **12%** of requests.',
};
const nextSteps: MarkdownNode = {
  type: 'markdown',
  text: '- Roll back the 14:00 deploy.\n- Watch p99 latency.',
};
const divider: DividerNode = { type: 'divider' };
const conclusion: QuoteNode = {
  type: 'quote',
  text: 'The regression started with the cache change.',
};

const example: SectionNode = { type: 'section', title: 'Impact', body: [impact] };

// A titled frame holding lines of content.
const icon = componentIcon(
  ({ accent, muted }) =>
    `<rect x="2.75" y="2.75" width="10.5" height="10.5" rx="1.5" stroke="${muted}"/><path d="M5 5.75h4" stroke="${accent}"/><path d="M5 8.5h6M5 10.75h4.5" stroke="${muted}"/>`
);

export const section = definePrimitive<SectionNode, typeof sectionSchema>({
  type: 'section',
  schema: sectionSchema,
  schemaFor: (bodyNodeSchema) =>
    sectionSchema.extend({
      body: z.array(bodyNodeSchema).min(1).describe('The section content, in order.'),
    }),
  catalog: {
    type: 'section',
    purpose: 'A labeled part of a message, such as "Impact" or "Conclusion", holding its content.',
    useWhen: ['A part of the message needs a short label above the content it groups.'],
    avoidWhen: ['The label has no content under it. Use a `header`.'],
    example,
  },
  icon,
  examples: [
    example,
    {
      type: 'section',
      title: 'Next steps',
      collapsible: true,
      body: [nextSteps, divider, conclusion],
    },
  ],
  children: ({ body }) => body.map((node, index) => ({ node, path: `body[${index}]` })),
  renderers: {
    react: sectionReactRenderer,
    text: ({ title, body }, { scope }) =>
      [oneLine(title), ...body.map((child) => scope.renderText(child))]
        .filter(Boolean)
        .join('\n\n'),
    markdown: ({ title, body }, { scope }) => [
      md.heading(TITLE_DEPTH, oneLine(title)),
      ...body.map((child) => scope.renderMarkdownContent(child)),
    ],
    slack: ({ title, collapsible, body }, { collector, scope }) =>
      slackContainer(
        oneLine(title),
        body.flatMap((child) => scope.renderSlack(child, collector)),
        { ...(collapsible ? { is_collapsible: true } : {}), fallbackLevel: 3 }
      ),
  },
});
