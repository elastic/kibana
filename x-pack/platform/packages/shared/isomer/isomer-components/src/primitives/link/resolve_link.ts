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

/** The URL React links to for an app path, through the host's `resolveKibanaPath`. */
export const reactAppHref = (
  target: { app: string; path?: string },
  context: ComponentsRenderContext
): string | null => {
  const resolved = context.resolveKibanaPath?.(appLinkPath(target));
  return resolved ? sanitizeNavigationHref(resolved) : null;
};

/**
 * The URL Slack links to for an app path: joined onto the render's `baseUrl`, keeping its base path
 * and space. `slackLinkUrl` alone would resolve `/app/…` onto the origin and drop both.
 */
export const slackAppHref = (
  target: { app: string; path?: string },
  baseUrl: string | undefined
): string | null => {
  if (baseUrl === undefined) {
    return null;
  }
  const base = new URL(baseUrl);
  const prefix = `${base.origin}${base.pathname.replace(/\/+$/, '')}`;
  // Parsing percent-encodes what Slack won't take as written, such as a space in a Discover query.
  return slackLinkUrl(new URL(`${prefix}${appLinkPath(target)}`).href);
};

/** The URL React links to: `url`, or the app path through the host's `resolveKibanaPath`. */
export const reactLinkHref = (node: LinkNode, context: ComponentsRenderContext): string | null => {
  const { app, path, url } = node;
  if (url !== undefined) {
    return staticLinkUrl(node);
  }
  return app === undefined ? null : reactAppHref({ app, path }, context);
};

/** The URL Slack links to: `url`, or the app path joined onto the render's `baseUrl`. */
export const slackLinkHref = (node: LinkNode, baseUrl: string | undefined): string | null => {
  const { app, path, url } = node;
  if (url !== undefined) {
    return slackLinkUrl(url);
  }
  return app === undefined ? null : slackAppHref({ app, path }, baseUrl);
};
