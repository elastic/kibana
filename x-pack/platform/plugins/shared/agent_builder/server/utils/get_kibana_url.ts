/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { addSpaceIdToPath } from '@kbn/core-spaces-common';

export function getKibanaUrl(
  coreSetup: CoreSetup,
  cloudSetup?: CloudSetup,
  request?: KibanaRequest
) {
  const baseUrl =
    coreSetup.http.basePath.publicBaseUrl ??
    cloudSetup?.kibanaUrl ??
    getFallbackKibanaUrl(coreSetup);

  if (request) {
    return addSpaceIdToPath(baseUrl, request.spaceId);
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
