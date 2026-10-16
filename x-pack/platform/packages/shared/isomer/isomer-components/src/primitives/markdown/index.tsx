/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { nodeAnchor, requiredString, z } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { definePrimitive } from '../../define';
import { exceedsParseBudget, urlTransform } from './markdown_safety';

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

const remarkPlugins = [remarkGfm];

const renderMarkdown = (text: string): React.ReactNode => {
  if (exceedsParseBudget(text)) {
    return text;
  }
  try {
    return Markdown({ children: text, remarkPlugins, skipHtml: true, urlTransform });
  } catch (error) {
    // `Markdown` parses synchronously and uses no hooks, so a `RangeError` can be
    // caught here.
    if (!(error instanceof RangeError)) {
      throw error;
    }

    return text;
  }
};

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
  examples,
  renderers: {
    react: (node, { context }) => (
      <div {...nodeAnchor(context, node)}>{renderMarkdown(node.text)}</div>
    ),
    text: ({ text }) => text,
    markdown: ({ text }) => md.authored(text),
  },
});
