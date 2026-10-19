/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry, PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromTextChildren } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import { SLACK_LIMITS, clampSlackText } from '@elastic/isomer-sdk/slack';

import { componentIcon, definePrimitive, oneLine, plainText } from '../../lib';
import { headerReactRenderer } from './header_react';

const schema = z.object({
  type: z.literal('header'),
  text: fromTextChildren(plainText(200).describe('The heading, in plain text.')),
  level: z
    .literal([1, 2, 3, 4])
    .optional()
    .describe('1 to 4, largest to smallest. Omit it for a title; use 3 to label a section.'),
});

/** A heading: a message's title, or a section's label. */
export type HeaderNode = z.infer<typeof schema> & PrimitiveNode;

/** A composition's own title is depth 1, so a level 1 header sits one below it. */
export const HEADING_DEPTH = { 1: 2, 2: 3, 3: 4, 4: 5 } as const;

const example: HeaderNode = { type: 'header', text: 'Impact', level: 3 };

// An H over an underline.
const icon = componentIcon(
  ({ accent, fg }) =>
    `<path d="M4.5 3.5v7M11.5 3.5v7M4.5 7h7" stroke="${fg}"/><path d="M4 13h8" stroke="${accent}"/>`
);

const catalog: PrimitiveCatalogEntry = {
  type: 'header',
  purpose: 'A heading for a message, or a label above the section that follows it.',
  useWhen: [
    'The message needs a title.',
    'A section of the message needs a short label, such as "Impact" or "Conclusion".',
  ],
  avoidWhen: ['The heading is part of Markdown prose. Use a Markdown heading in `markdown`.'],
  example,
};

export const header = definePrimitive<HeaderNode, typeof schema>({
  type: 'header',
  schema,
  catalog,
  icon,
  examples: [
    { type: 'header', text: 'Checkout latency doubled on web-prod' },
    example,
    ...([1, 2, 4] as const).map(
      (level): HeaderNode => ({
        type: 'header',
        text: `A level ${level} header`,
        level,
      })
    ),
  ],
  renderers: {
    react: headerReactRenderer,
    text: ({ text }) => oneLine(text),
    markdown: ({ text, level = 1 }) => md.heading(HEADING_DEPTH[level], oneLine(text)),
    slack: ({ text, level }) => ({
      type: 'header',
      text: {
        type: 'plain_text',
        text: clampSlackText(oneLine(text), SLACK_LIMITS.headerTextChars),
        emoji: true,
      },
      ...(level ? { level } : {}),
    }),
  },
});
