/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { DEFAULT_SPACE_ID, getSpaceIdFromPath } from '@kbn/spaces-plugin/common';

export function getKibanaUrl(
  coreSetup: CoreSetup,
  cloudSetup?: CloudSetup,
  request?: KibanaRequest,
  spaces?: SpacesPluginStart
) {
  const baseUrl =
    coreSetup.http.basePath.publicBaseUrl ??
    cloudSetup?.kibanaUrl ??
    getFallbackKibanaUrl(coreSetup);

  const pathname = new URL(baseUrl).pathname;
  const serverBasePath = coreSetup.http.basePath.serverBasePath;
  const { pathHasExplicitSpaceIdentifier } = getSpaceIdFromPath(pathname, serverBasePath);

  // If URL doesn't have a space and we have a non-default space, add it
  if (!pathHasExplicitSpaceIdentifier && request && spaces) {
    const spaceId = spaces.spacesService?.getSpaceId(request) || DEFAULT_SPACE_ID;
    if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
      return `${baseUrl}/s/${spaceId}`;
    }
  }

  return baseUrl;
}

export function getFallbackKibanaUrl({ http }: CoreSetup) {
  const basePath = http.basePath;
  const { protocol, hostname, port } = http.getServerInfo();
  return `${protocol}://${hostname}:${port}${basePath
    // Prepending on '' removes the serverBasePath
    .prepend('/')
    .slice(0, -1)}`;
}
