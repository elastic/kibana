/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigationHref, z, type PrimitiveNode } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';

import { componentIcon, definePrimitive, oneLine, plainText } from '../../lib';

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
