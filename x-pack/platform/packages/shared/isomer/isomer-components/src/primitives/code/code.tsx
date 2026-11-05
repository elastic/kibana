/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromTextChildren } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS, clampSlackText, escapeMrkdwn } from '@elastic/isomer-sdk/slack';
import { i18n } from '@kbn/i18n';

import { componentIcon, definePrimitive, hasText, plainText } from '../../lib';
import { codeReactRenderer } from './code_react';

const codeSchema = z.object({
  type: z.literal('code'),
  text: fromTextChildren(
    plainText().describe('The code or source, exactly as written. Whitespace is kept.'),
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

/** How much code Slack shows: four section-sized rich-text elements. */
const SLACK_CODE_CHARS = SLACK_LIMITS.sectionTextChars * 4;

const cutNote = (shown: number, total: number): string =>
  i18n.translate('xpack.isomer.components.code.cutNote', {
    defaultMessage: 'Showing the first {shown} of {total} characters',
    values: { shown: shown.toLocaleString('en-US'), total: total.toLocaleString('en-US') },
  });

/** A preformatted rich-text block, cut to {@link SLACK_CODE_CHARS} with a note. */
const slackCode = ({ text }: CodeNode): SlackBlock[] => {
  const shown = clampSlackText(text, SLACK_CODE_CHARS);
  const isCut = shown !== text;

  return [
    {
      type: 'rich_text',
      elements: [{ type: 'rich_text_preformatted', elements: [{ type: 'text', text: shown }] }],
    },
    ...(isCut
      ? [
          {
            type: 'context' as const,
            elements: [
              {
                type: 'mrkdwn' as const,
                // Without the ellipsis `clampSlackText` ends the cut text with.
                text: escapeMrkdwn(cutNote(shown.length - 1, text.length)),
              },
            ],
          },
        ]
      : []),
  ];
};

export const code = definePrimitive<CodeNode, typeof codeSchema>({
  type: 'code',
  schema: codeSchema,
  sanitize: (node) => (hasText(node.text) ? node : null),
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
    react: codeReactRenderer,
    text: ({ text }) => text,
    markdown: ({ text, language }) => md.codeBlock(text, language),
    slack: slackCode,
  },
});
