/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IBasePath, KibanaRequest } from '@kbn/core/server';
import { getSpaceIdFromPath } from '@kbn/core-spaces-common';

const PROTECTED_RESOURCE_WELL_KNOWN_PATH = '/.well-known/oauth-protected-resource';

export function getRequestSpacePrefix(basePath: IBasePath, request: KibanaRequest): string {
  return basePath.get(request).slice(basePath.serverBasePath.length);
}

export function getProtectedResource(configuredResource: string, spacePrefix: string): string {
  const url = new URL(configuredResource);
  url.pathname = `${spacePrefix}${url.pathname}`;
  return url.toString();
}

export function getProtectedResourceMetadataUrl(resource: string): string {
  const { origin, pathname } = new URL(resource);
  return `${origin}${PROTECTED_RESOURCE_WELL_KNOWN_PATH}${pathname === '/' ? '' : pathname}`;
}

export function resolveProtectedResource(
  configuredResource: string,
  discoveryPath: string
): string | undefined {
  const { spaceId, pathname, hasExplicitSpaceIdentifier } = getSpaceIdFromPath(`/${discoveryPath}`);
  if (pathname !== new URL(configuredResource).pathname) {
    return undefined;
  }
  return getProtectedResource(
    configuredResource,
    hasExplicitSpaceIdentifier ? `/s/${spaceId}` : ''
  );
}
