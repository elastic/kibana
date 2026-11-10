/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { requiredString, z } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';

import { componentIcon, definePrimitive } from '../../lib';
import { markdownReactRenderer } from './markdown_react';

/** A block of GitHub-flavored Markdown. */
export interface MarkdownNode extends PrimitiveNode {
  type: 'markdown';
  text: string;
}

const example: MarkdownNode = {
  type: 'markdown',
  text: 'There are **3** open alerts. [Review them](https://www.elastic.co).',
};

const headerAndTableExample: MarkdownNode = {
  type: 'markdown',
  text: [
    '## Top hosts',
    '',
    '| host | errors |',
    '| --- | ---: |',
    '| web-1 | 42 |',
    '| web-2 | 7 |',
    '',
    '- Errors peaked at 14:00.',
    '- `web-1` restarted twice.',
  ].join('\n'),
};

const examples: MarkdownNode[] = [example, headerAndTableExample];

// The Markdown mark: an M beside a down arrow.
const icon = componentIcon(
  ({ accent, fg }) =>
    `<path d="M3 11V5l2.5 3L8 5v6" stroke="${fg}"/><path d="M11.5 5v6M9.5 9l2 2 2-2" stroke="${accent}"/>`
);

export const markdown = definePrimitive<MarkdownNode>({
  type: 'markdown',
  schema: z.object({
    type: z.literal('markdown'),
    text: requiredString().describe('GitHub-flavored Markdown.'),
  }),
  catalog: {
    type: 'markdown',
    purpose: 'A block of prose in GitHub-flavored Markdown.',
    useWhen: ['The message is text: paragraphs, lists, links, code or tables.'],
    avoidWhen: [],
    example,
  },
  icon,
  examples,
  renderers: {
    react: markdownReactRenderer,
    text: ({ text }) => text,
    markdown: ({ text }) => md.authored(text),
  },
});
