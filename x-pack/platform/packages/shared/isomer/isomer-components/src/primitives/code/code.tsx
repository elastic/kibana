/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { nodeAnchor, z } from '@elastic/isomer-sdk';
import { fromTextChildren } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackRichTextBlock } from '@elastic/isomer-sdk/slack';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';

import { componentIcon, definePrimitive, plainText } from '../../lib';

const codeSchema = z.object({
  type: z.literal('code'),
  text: fromTextChildren(
    plainText(12000).describe('The code or source, exactly as written. Whitespace is kept.'),
    { dedent: true }
  ),
  language: z
    .string()
    .regex(/^[a-z0-9][a-z0-9+#.-]{0,29}$/, {
      error: 'must be a lowercase language name, such as esql or json',
    })
    .optional()
    .describe('The language, such as "esql", "json" or "markdown", for surfaces that show it.'),
});

/** Code or source shown as written, such as an ES|QL query. */
export type CodeNode = z.infer<typeof codeSchema> & PrimitiveNode;

const example: CodeNode = {
  type: 'code',
  language: 'esql',
  text: 'FROM logs-*\n| WHERE log.level == "error"\n| STATS count = COUNT(*) BY service.name',
};

// Angle brackets around a slash.
const icon = componentIcon(
  ({ accent, muted }) =>
    `<path d="M5.5 4.5 2.5 8l3 3.5M10.5 4.5l3 3.5-3 3.5" stroke="${accent}"/><path d="m9 3.5-2 9" stroke="${muted}"/>`
);

const { handles } = isomerDistillery.createStyleModule(
  'componentsCode',
  ({ css, tokens: { border, color, font, size } }) => ({
    root: css`
      margin: ${size.m} 0;
      padding: ${size.m};
      overflow-x: auto;
      border-radius: ${border.radius.control};
      background: ${color.background.subdued};
      color: ${color.text.paragraph};
      font-family: ${font.family.code};
      font-size: ${font.size.s};
      line-height: ${font.lineHeight.s};
      white-space: pre;
    `,
  })
);

const slackCode = ({ text }: CodeNode): SlackRichTextBlock => ({
  type: 'rich_text',
  elements: [{ type: 'rich_text_preformatted', elements: [{ type: 'text', text }] }],
});

export const code = definePrimitive<CodeNode, typeof codeSchema>({
  type: 'code',
  schema: codeSchema,
  catalog: {
    type: 'code',
    purpose: 'A block of code, a query, or source text, shown exactly as written.',
    useWhen: ['The reader needs the exact text, such as an ES|QL query to copy.'],
    avoidWhen: ['The text is prose with an inline code span. Use `markdown`.'],
    example,
  },
  icon,
  examples: [example, { type: 'code', text: '{\n  "status": "green"\n}', language: 'json' }],
  renderers: {
    react: (node, { context }) => (
      <pre {...nodeAnchor(context, node)} className={classNames(context, handles.root)}>
        <code data-language={node.language}>{node.text}</code>
      </pre>
    ),
    text: ({ text }) => text,
    markdown: ({ text, language }) => md.codeBlock(text, language),
    slack: slackCode,
  },
});
