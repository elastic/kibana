/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { nodeAnchor, z } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';
import {
  componentIcon,
  definePrimitive,
  oneLine,
  plainText,
  SIZE,
  TEXT,
  snapshotMetrics,
  textHeight,
} from '../../lib';
import { contextSlackRenderer } from './context_slack';

const itemSchema = z
  .object({
    text: plainText(500).describe('One short fact, in plain text.'),
  })
  .strict();

const contextSchema = z.object({
  type: z.literal('context'),
  items: fromChildren(
    'item',
    z
      .array(itemSchema)
      .min(1)
      .max(SLACK_LIMITS.contextElements)
      .describe('Facts shown on one line, in order. 1 to 10.'),
    { text: 'text' }
  ),
});

/** A line of small, secondary facts, such as a status, an owner, or a time. */
export type ContextNode = z.infer<typeof contextSchema> & PrimitiveNode;

const SEPARATOR = ' · ';

const joined = ({ items }: ContextNode, separator: string): string =>
  items.map(({ text }) => oneLine(text)).join(separator);

const example: ContextNode = {
  type: 'context',
  items: [{ text: '⚠️ Investigation failed' }, { text: 'Automation: Checkout errors' }],
};

// Short facts on one line, split by dots.
const icon = componentIcon(
  ({ accent, muted }) =>
    `<path d="M2.5 8h2M7.25 8h1.5M11.5 8h2" stroke="${muted}"/><circle cx="6" cy="8" r="1.25" fill="${accent}"/><circle cx="10" cy="8" r="1.25" fill="${accent}"/>`
);

const { handles } = isomerDistillery.createStyleModule(
  'componentsContext',
  ({ css, tokens: { color, font, size } }) => ({
    root: css`
      margin: ${size.s} 0;
      color: ${color.text.subdued};
      font-size: ${font.size.xs};
      line-height: ${font.lineHeight.xs};
    `,
  })
);

export const context = definePrimitive<ContextNode, typeof contextSchema>({
  type: 'context',
  schema: contextSchema,
  catalog: {
    type: 'context',
    purpose: 'A line of small, secondary facts under a heading or a section.',
    useWhen: [
      'The message has a status, owner, source, or time worth noting but not leading with.',
    ],
    avoidWhen: ['The facts are the point of the message. Use `markdown`.'],
    example,
  },
  icon,
  examples: [example, { type: 'context', items: [{ text: 'Updated 5 minutes ago' }] }],
  metrics: snapshotMetrics<ContextNode>(
    'context',
    (node) => textHeight(joined(node, SEPARATOR), TEXT.xs) + SIZE.s
  ),
  renderers: {
    react: (node, { context: renderContext }) => (
      <p {...nodeAnchor(renderContext, node)} className={classNames(renderContext, handles.root)}>
        {joined(node, SEPARATOR)}
      </p>
    ),
    text: (node) => joined(node, SEPARATOR),
    markdown: (node) => md.paragraph(joined(node, SEPARATOR)),
    slack: contextSlackRenderer,
  },
});
