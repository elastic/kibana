/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { nodeAnchor, z } from '@elastic/isomer-sdk';
import { fromTextChildren } from '@elastic/isomer-sdk/author';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';
import {
  componentIcon,
  definePrimitive,
  plainText,
  BORDER,
  SIZE,
  TEXT,
  snapshotMetrics,
  textHeight,
} from '../../lib';
import { quoteMarkdownRenderer } from './quote_markdown';

const quoteSchema = z.object({
  type: z.literal('quote'),
  text: fromTextChildren(
    plainText(3000).describe('The quoted passage, in plain text. Line breaks are kept.'),
    { dedent: true }
  ),
});

/** A quoted passage, such as a conclusion or a finding in someone's words. */
export type QuoteNode = z.infer<typeof quoteSchema> & PrimitiveNode;

const LINE_BREAK = /\r?\n/;

const lines = (text: string): string[] => text.trim().split(LINE_BREAK);

const example: QuoteNode = {
  type: 'quote',
  text: 'The checkout latency regression started with the 14:05 deploy of payments-api.',
};

// A quote bar beside its lines.
const icon = componentIcon(
  ({ accent, muted }) =>
    `<path d="M4 3.5v9" stroke="${accent}"/><path d="M6.75 5h5.75M6.75 8h5.75M6.75 11h3.5" stroke="${muted}"/>`
);

const { handles } = isomerDistillery.createStyleModule(
  'componentsQuote',
  ({ css, tokens: { border, color, size } }) => ({
    root: css`
      margin: ${size.m} 0;
      padding-left: ${size.m};
      border-left: ${border.width.thick} solid ${color.border.plain};
      color: ${color.text.subdued};
    `,
  })
);

export const quote = definePrimitive<QuoteNode, typeof quoteSchema>({
  type: 'quote',
  schema: quoteSchema,
  catalog: {
    type: 'quote',
    purpose: 'Sets a passage apart as quoted: a conclusion, a verdict, or a finding as stated.',
    useWhen: ['One passage is the answer the reader came for.'],
    avoidWhen: [
      'The passage is ordinary explanatory prose. Use `markdown`.',
      'Another node already states the finding.',
    ],
    example,
  },
  icon,
  examples: [
    example,
    {
      type: 'quote',
      text: 'Two causes overlapped:\na slow database failover,\nand a retry storm.',
    },
  ],
  metrics: snapshotMetrics<QuoteNode>(
    'quote',
    ({ text }) => textHeight(lines(text).join('\n'), TEXT.s, SIZE.m + BORDER.thick) + SIZE.m
  ),
  renderers: {
    react: (node, { context }) => (
      <blockquote {...nodeAnchor(context, node)} className={classNames(context, handles.root)}>
        {lines(node.text).map((line, index) => (
          <Fragment key={index}>
            {index > 0 ? <br /> : null}
            {line}
          </Fragment>
        ))}
      </blockquote>
    ),
    text: ({ text }) =>
      lines(text)
        .map((line) => `> ${line}`.trimEnd())
        .join('\n'),
    markdown: quoteMarkdownRenderer,
    slack: ({ text }) => ({
      type: 'rich_text',
      elements: [{ type: 'rich_text_quote', elements: [{ type: 'text', text: text.trim() }] }],
    }),
  },
});
