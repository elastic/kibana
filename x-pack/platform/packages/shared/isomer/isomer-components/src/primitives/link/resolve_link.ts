/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';
import { slackLinkUrl } from '@elastic/isomer-sdk/slack';

import type { ComponentsRenderContext } from '../../lib';
import type { LinkNode } from './link';

const ABSOLUTE_HTTP = /^https?:\/\//i;

/** The path of the app routed at `/app/{app}`, relative to the space's base URL. */
export const appLinkPath = ({ app, path }: { app: string; path?: string }): string =>
  `/app/${app}${path ?? ''}`;

const absoluteHref = (href: string | null | undefined): string | null => {
  const sanitized = href ? sanitizeNavigationHref(href) : null;
  return sanitized && ABSOLUTE_HTTP.test(sanitized) ? sanitized : null;
};

/** The node's `url`, which every surface can link to without a host. */
export const staticLinkUrl = ({ url }: LinkNode): string | null => absoluteHref(url);

/** The URL React links to: `url`, or the app path through the host's `resolveKibanaPath`. */
export const reactLinkHref = (node: LinkNode, context: ComponentsRenderContext): string | null => {
  const { app, path, url } = node;
  if (url !== undefined) {
    return staticLinkUrl(node);
  }
  if (app === undefined) {
    return null;
  }
  const resolved = context.resolveKibanaPath?.(appLinkPath({ app, path }));
  return resolved ? sanitizeNavigationHref(resolved) : null;
};

/**
 * The URL Slack links to: `url`, or `app` joined onto the render's `baseUrl`, keeping its base path
 * and space. `slackLinkUrl` alone would resolve `/app/…` onto the origin and drop both.
 */
export const slackLinkHref = (node: LinkNode, baseUrl: string | undefined): string | null => {
  const { app, path, url } = node;
  if (url !== undefined) {
    return slackLinkUrl(url);
  }
  if (app === undefined || baseUrl === undefined) {
    return null;
  }
  const base = new URL(baseUrl);
  const prefix = `${base.origin}${base.pathname.replace(/\/+$/, '')}`;
  // Parsing percent-encodes what Slack won't take as written, such as a space in a Discover query.
  return slackLinkUrl(new URL(`${prefix}${appLinkPath({ app, path })}`).href);
};
