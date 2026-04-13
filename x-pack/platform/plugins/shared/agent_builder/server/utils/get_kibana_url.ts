/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { DEFAULT_SPACE_ID, addSpaceIdToPath, getSpaceIdFromPath } from '@kbn/spaces-plugin/common';

type HttpServerBaseUrlDeps = Pick<CoreSetup['http'], 'basePath' | 'getServerInfo'>;

/**
 * Base URL for server-side loopback HTTP to this Kibana (same resolution as {@link getKibanaUrl}).
 * Does not require `server.publicBaseUrl` when bind address + cloud URL suffice.
 */
export function resolveKibanaLoopbackBaseUrl(params: {
  http: HttpServerBaseUrlDeps;
  cloudKibanaUrl?: string;
}): string {
  return (
    params.http.basePath.publicBaseUrl ?? params.cloudKibanaUrl ?? getFallbackKibanaUrl(params.http)
  );
}

export function getKibanaUrl(
  coreSetup: CoreSetup,
  cloudSetup?: CloudSetup,
  request?: KibanaRequest,
  spaces?: SpacesPluginStart
) {
  const baseUrl = resolveKibanaLoopbackBaseUrl({
    http: coreSetup.http,
    cloudKibanaUrl: cloudSetup?.kibanaUrl,
  });

  const pathname = new URL(baseUrl).pathname;
  const serverBasePath = coreSetup.http.basePath.serverBasePath;
  const { pathHasExplicitSpaceIdentifier } = getSpaceIdFromPath(pathname, serverBasePath);

  if (!pathHasExplicitSpaceIdentifier && request && spaces) {
    const spaceId = spaces.spacesService?.getSpaceId(request) || DEFAULT_SPACE_ID;
    return addSpaceIdToPath(baseUrl, spaceId);
  }

  return baseUrl;
}

export function getFallbackKibanaUrl(http: HttpServerBaseUrlDeps) {
  const basePath = http.basePath;
  const { protocol, hostname, port } = http.getServerInfo();
  return `${protocol}://${hostname}:${port}${basePath
    // Prepending on '' removes the serverBasePath
    .prepend('/')
    .slice(0, -1)}`;
}
