/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { isInternalURL } from '@kbn/std';
import { addSpaceIdToPath, getSpaceIdFromPath } from '@kbn/core-spaces-common';
import { CUSTOM_CONTENT_ALLOWED_LINK_APPS } from './constants';

export interface LinkBasePath {
  requestBasePath: string;
  serverBasePath: string;
}

export const getLinkBasePath = ({ basePath }: Pick<HttpStart, 'basePath'>): LinkBasePath => ({
  requestBasePath: basePath.get(),
  serverBasePath: basePath.serverBasePath,
});

export const isKibanaFramed = (): boolean => window.top !== window.self;

/**
 * Returns a link that is safe to navigate the top window to, or undefined when `href` is not a path
 * to one of the allowed apps. A link without a space prefix stays in the current space, and a link
 * with one keeps its own space. The result is rebuilt from the parsed URL, never the original
 * string, so dot segments (including `%2e%2e`) and other parser quirks cannot survive into the
 * output.
 */
export const toSafeInternalHref = (
  href: string,
  { requestBasePath, serverBasePath }: LinkBasePath
): string | undefined => {
  if (!href.startsWith('/') || !isInternalURL(href)) return undefined;
  const { pathname, search, hash } = new URL(href, window.location.origin);
  const link = getSpaceIdFromPath(pathname);
  if (link.hasExplicitSpaceIdentifier && !link.pathname.startsWith('/')) return undefined;

  const [root, appId] = link.pathname.split('/').slice(1);
  if (root !== 'app' || !appId || !CUSTOM_CONTENT_ALLOWED_LINK_APPS.includes(appId)) {
    return undefined;
  }

  const { spaceId } = link.hasExplicitSpaceIdentifier
    ? link
    : getSpaceIdFromPath(requestBasePath, serverBasePath);
  return `${addSpaceIdToPath(serverBasePath, spaceId, link.pathname)}${search}${hash}`;
};
