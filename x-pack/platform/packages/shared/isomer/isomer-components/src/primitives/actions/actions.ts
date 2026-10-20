/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigationHref, z, type PrimitiveNode } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';

import { CARD_CONTENT_WIDTH } from '@kbn/isomer-theme';
import {
  componentIcon,
  definePrimitive,
  oneLine,
  plainText,
  BORDER,
  SIZE,
  TEXT,
  snapshotMetrics,
  textWidth,
} from '../../lib';

import { actionsReactRenderer } from './actions_react';
import { actionsSlackRenderer } from './actions_slack';
import { actionsMarkdownRenderer } from './actions_markdown';

const buttonSchema = z
  .object({
    label: plainText(SLACK_LIMITS.buttonTextChars).describe('What the link opens, in a few words.'),
    url: navigationHref({ max: SLACK_LIMITS.urlChars }),
    primary: z.boolean().optional().describe('Marks the one action the reader should take.'),
  })
  .strict();

const actionsSchema = z.object({
  type: z.literal('actions'),
  buttons: fromChildren(
    'button',
    z.array(buttonSchema).min(1).max(5).describe('Links, in order. 1 to 5.'),
    { text: 'label' }
  ),
});

const example: ActionsNode = {
  type: 'actions',
  buttons: [
    {
      label: 'View Full Investigation',
      url: 'https://kibana.example.com/app/investigations/1',
      primary: true,
    },
  ],
};

// A primary button beside a secondary one.
const icon = componentIcon(
  ({ accent, muted }) =>
    `<rect x="2" y="5.5" width="5.5" height="5" rx="1.25" fill="${accent}"/><rect x="9.25" y="6.25" width="4.75" height="3.5" rx="1" stroke="${muted}"/>`
);

/** A row of link buttons, such as one that opens the full record in Kibana. */
export type ActionsNode = z.infer<typeof actionsSchema> & PrimitiveNode;

export const actions = definePrimitive<ActionsNode, typeof actionsSchema>({
  type: 'actions',
  schema: actionsSchema,
  catalog: {
    type: 'actions',
    purpose: 'Links the reader can follow, shown as buttons where the surface has them.',
    useWhen: ['The message points to where the reader can see more or act, such as Kibana.'],
    avoidWhen: ['The link belongs inside a sentence. Use a Markdown link in `markdown`.'],
    example,
  },
  icon,
  // Buttons wrap onto as many rows as their labels need.
  metrics: snapshotMetrics<ActionsNode>('actions', ({ buttons }) => {
    const rows = buttons.reduce(
      ({ count, used }, { label }) => {
        const width = textWidth(oneLine(label), TEXT.s.fontSize) + 2 * (SIZE.m + BORDER.thin);
        return used > 0 && used + SIZE.s + width > CARD_CONTENT_WIDTH
          ? { count: count + 1, used: width }
          : { count, used: used + (used > 0 ? SIZE.s : 0) + width };
      },
      { count: 1, used: 0 }
    ).count;
    const buttonHeight = TEXT.s.lineHeight + 2 * (SIZE.xs + BORDER.thin);
    return rows * buttonHeight + (rows - 1) * SIZE.s + SIZE.m;
  }),
  examples: [
    example,
    {
      type: 'actions',
      buttons: [
        { label: 'Open in Discover', url: 'https://kibana.example.com/app/discover' },
        { label: 'Edit in Management', url: 'https://kibana.example.com/app/management' },
      ],
    },
  ],
  renderers: {
    react: actionsReactRenderer,
    text: ({ buttons }) => buttons.map(({ label, url }) => `${oneLine(label)}: ${url}`).join('\n'),
    markdown: actionsMarkdownRenderer,
    slack: actionsSlackRenderer,
  },
});
