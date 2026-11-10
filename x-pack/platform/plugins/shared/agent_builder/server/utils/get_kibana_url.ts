/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IBasePath, KibanaRequest } from '@kbn/core/server';
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

export function getPublicKibanaUrl(basePath: IBasePath, cloud?: CloudSetup, spaceId?: string) {
  const baseUrl = basePath.publicBaseUrl ?? cloud?.kibanaUrl;
  return baseUrl && spaceId ? addSpaceIdToPath(baseUrl, spaceId) : baseUrl;
}

/** The absolute URL of `path` in the Kibana `app`, under the space's public `kibanaUrl`. */
export const toKibanaAppUrl = (kibanaUrl: string, app: string, path = ''): string =>
  // Parsing percent-encodes what Slack won't take as written, such as a space in a Discover query.
  new URL(`${kibanaUrl.replace(/\/+$/, '')}/app/${app}${path}`).href;

export function getFallbackKibanaUrl({ http }: CoreSetup) {
  const basePath = http.basePath;
  const { protocol, hostname, port } = http.getServerInfo();
  return `${protocol}://${hostname}:${port}${basePath
    // Prepending on '' removes the serverBasePath
    .prepend('/')
    .slice(0, -1)}`;
}
