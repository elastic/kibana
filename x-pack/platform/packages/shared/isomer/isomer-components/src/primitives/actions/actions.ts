/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigationHref, z, type PrimitiveNode } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';

import {
  actionEventSchema,
  componentIcon,
  definePrimitive,
  eventFallbackSchema,
  oneLine,
  plainText,
} from '../../lib';
import { appPathSchema, appRouteSchema } from '../link/link_target';

import { actionsReactRenderer } from './actions_react';
import { actionsSlackRenderer } from './actions_slack';
import { actionsMarkdownRenderer, eventFallback } from './actions_markdown';

/** Requires exactly one of `url`, `app` or `event`, and `path` only with `app`. */
const refineButtonTarget = (
  { url, app, path, event }: { url?: string; app?: string; path?: string; event?: object },
  context: z.RefinementCtx
) => {
  const targets = [url, app, event].filter((target) => target !== undefined);

  if (targets.length !== 1) {
    context.addIssue({ code: 'custom', message: 'give exactly one of url, app or event' });
  }
  if (path !== undefined && app === undefined) {
    context.addIssue({ code: 'custom', message: 'needs app', path: ['path'] });
  }
};

const buttonSchema = z
  .object({
    label: plainText(SLACK_LIMITS.buttonTextChars).describe(
      'What the button opens or does, in a few words.'
    ),
    url: navigationHref({ max: SLACK_LIMITS.urlChars })
      .optional()
      .describe('The URL it opens. Give one of `url`, `app` or `event`.'),
    app: appRouteSchema
      .optional()
      .describe(
        'The Kibana app route after /app/, such as "discover". Each host resolves it in the current space.'
      ),
    path: appPathSchema.optional().describe('A path inside `app`, such as "/manage/skills".'),
    event: actionEventSchema
      .optional()
      .describe('An event raised on click, for the host to handle, instead of opening a link.'),
    style: z
      .enum(['primary', 'danger'])
      .optional()
      .describe(
        '`primary` marks the one action the reader should take, and `danger` one that destroys or cannot be undone.'
      ),
  })
  .strict()
  .superRefine(refineButtonTarget);

const actionsSchema = z.object({
  type: z.literal('actions'),
  buttons: fromChildren(
    'button',
    z.array(buttonSchema).min(1).max(5).describe('Buttons, in order. 1 to 5.'),
    { text: 'label' }
  ),
  fallback: eventFallbackSchema,
});

const example: ActionsNode = {
  type: 'actions',
  buttons: [
    {
      label: 'View Full Investigation',
      url: 'https://kibana.example.com/app/investigations/1',
      style: 'primary',
    },
  ],
};

// A primary button beside a secondary one.
const icon = componentIcon(
  ({ accent, muted }) =>
    `<rect x="2" y="5.5" width="5.5" height="5" rx="1.25" fill="${accent}"/><rect x="9.25" y="6.25" width="4.75" height="3.5" rx="1" stroke="${muted}"/>`
);

/** A row of buttons that open a link, such as the full record in Kibana, or raise an event. */
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
    {
      type: 'actions',
      buttons: [
        {
          label: 'Delete',
          event: { name: 'confirm', context: { allow: true } },
          style: 'danger',
        },
        { label: 'Cancel', event: { name: 'confirm', context: { allow: false } } },
      ],
      fallback: 'Reply yes or no.',
    },
  ],
  renderers: {
    react: actionsReactRenderer,
    text: ({ buttons, fallback }) =>
      [
        ...buttons.flatMap(({ label, url, event }) => {
          if (event) {
            return [oneLine(label)];
          }
          return url ? [`${oneLine(label)}: ${url}`] : [];
        }),
        ...eventFallback({ buttons, fallback }),
      ].join('\n'),
    markdown: actionsMarkdownRenderer,
    slack: actionsSlackRenderer,
  },
});
