/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PrimitiveNode, Renderers } from '@elastic/isomer-sdk';
import { navigationHref, nodeAnchor, z } from '@elastic/isomer-sdk';
import { fromTextChildren } from '@elastic/isomer-sdk/author';
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
import type { ComponentsPackTypes } from '../../lib';
import { linkSlackRenderer } from './link_slack';
import { appLinkPath, reactLinkHref, staticLinkUrl } from './resolve_link';

const ABSOLUTE_HTTP = /^https?:\/\//i;
// A path that climbs out of its app can only climb back into one fixed route, so it can't stay
// inside two different apps.
const PROBE_APPS = ['probe-a', 'probe-b'] as const;

const staysInProbe = (app: string, path: string): boolean => {
  const root = appLinkPath({ app });
  try {
    const { pathname } = new URL(appLinkPath({ app, path }), 'http://kibana.invalid');
    return pathname === root || pathname.startsWith(`${root}/`);
  } catch {
    return false;
  }
};

/** Whether `path` stays inside its app once a URL parser decodes and normalizes it, as hosts do. */
const staysInApp = (path: string): boolean => PROBE_APPS.every((app) => staysInProbe(app, path));

const pathSchema = z
  .string()
  .max(2000)
  .refine((value) => /^[/?#]/.test(value) && !value.startsWith('//') && !value.includes('\\'), {
    error: 'must start with /, ? or #, and not with //',
  })
  .refine(staysInApp, { error: 'must not leave the app with ..' });

const linkSchema = z
  .object({
    type: z.literal('link'),
    label: fromTextChildren(
      plainText(SLACK_LIMITS.buttonTextChars).describe(
        'What the link opens, in a few words, such as "Open in Discover".'
      )
    ),
    app: z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/, {
        error: 'must be a Kibana app route, such as discover',
      })
      .optional()
      .describe(
        'The Kibana app route after /app/, such as "discover", or "security" for Security. It can differ from the app id. Each host resolves it in the current space.'
      ),
    path: pathSchema.optional().describe('A path inside `app`, such as "/kibana/skills/my-skill".'),
    url: navigationHref({ max: SLACK_LIMITS.urlChars })
      .refine((value) => ABSOLUTE_HTTP.test(value), { error: 'must be an absolute http(s) URL' })
      .optional()
      .describe('An absolute URL, when the link leaves Kibana. Give either `app` or `url`.'),
  })
  .superRefine(({ app, path, url }, context) => {
    if ((app === undefined) === (url === undefined)) {
      context.addIssue({
        code: 'custom',
        message: 'give exactly one of app or url',
        path: [app === undefined ? 'app' : 'url'],
      });
    }
    if (path !== undefined && app === undefined) {
      context.addIssue({ code: 'custom', message: 'needs app', path: ['path'] });
    }
  });

/** A link to a place in Kibana, by app and path, or to an absolute URL. */
export type LinkNode = z.infer<typeof linkSchema> & PrimitiveNode;

const example: LinkNode = {
  type: 'link',
  label: 'Read the ES|QL reference',
  url: 'https://www.elastic.co/docs/reference/query-languages/esql',
};

// A chain link.
const icon = componentIcon(
  ({ accent, muted }) =>
    `<path d="M7 9.5 9.5 7" stroke="${accent}"/><path d="M8.25 4.75 9.5 3.5a2.47 2.47 0 0 1 3.5 3.5l-1.25 1.25M7.75 11.25 6.5 12.5A2.47 2.47 0 0 1 3 9l1.25-1.25" stroke="${muted}"/>`
);

const { handles } = isomerDistillery.createStyleModule(
  'componentsLink',
  ({ css, tokens: { color, font, size } }) => ({
    root: css`
      margin: ${size.s} 0;
      font-size: ${font.size.s};
      line-height: ${font.lineHeight.s};
    `,
    anchor: css`
      color: ${color.text.primary};
      font-weight: ${font.weight.medium};
    `,
  })
);

const linkReactRenderer: Renderers<LinkNode, ComponentsPackTypes>['react'] = (
  node,
  { context }
) => {
  const href = reactLinkHref(node, context);
  return href ? (
    <p {...nodeAnchor(context, node)} className={classNames(context, handles.root)}>
      <a href={href} className={classNames(context, handles.anchor)}>
        {oneLine(node.label)}
      </a>
    </p>
  ) : null;
};

export const link = definePrimitive<LinkNode, typeof linkSchema>({
  type: 'link',
  schema: linkSchema,
  catalog: {
    type: 'link',
    purpose: 'One link to where the reader can see more, such as a page in Kibana.',
    useWhen: ['The content has a place in Kibana or on the web to open, such as Discover.'],
    avoidWhen: [
      'The link is the action the message asks for. Use `actions`.',
      'The link belongs inside a sentence. Use a Markdown link in `markdown`.',
    ],
    description:
      'A link. Give `app` (with an optional `path`) for a page in Kibana, or `url` for any other page. A host that cannot resolve it leaves it out.',
    example,
  },
  icon,
  examples: [
    example,
    // App links need a host to resolve them, which conformance doesn't supply; link.test.tsx covers them.
    {
      type: 'link',
      label: 'Open the Kibana guide',
      url: 'https://www.elastic.co/docs/explore-analyze',
    },
  ],
  metrics: snapshotMetrics<LinkNode>(
    'link',
    ({ label }) => textHeight(oneLine(label), TEXT.s) + SIZE.s
  ),
  renderers: {
    react: linkReactRenderer,
    text: (node) => {
      const url = staticLinkUrl(node);
      return url ? `${oneLine(node.label)}: ${url}` : '';
    },
    markdown: (node) => {
      const url = staticLinkUrl(node);
      return url ? md.paragraph(md.link(oneLine(node.label), url)) : [];
    },
    slack: linkSlackRenderer,
  },
});
