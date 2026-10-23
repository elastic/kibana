/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { HttpServiceStart } from '@kbn/core/server';

type KibanaUrlHttp = Pick<HttpServiceStart, 'basePath' | 'getServerInfo'>;
type KibanaUrlCloud = Pick<CloudSetup, 'kibanaUrl'>;

const getServerInfoUrl = ({ basePath, getServerInfo }: KibanaUrlHttp): string => {
  const { protocol, hostname, port } = getServerInfo();
  // Prepending on '/' yields the server base path with a trailing slash.
  return `${protocol}://${hostname}:${port}${basePath.prepend('/').slice(0, -1)}`;
};

/** Resolves the absolute Kibana URL: `publicBaseUrl`, then the cloud URL, then server info. */
export const getKibanaBaseUrl = (http: KibanaUrlHttp, cloud?: KibanaUrlCloud): string =>
  http.basePath.publicBaseUrl ?? cloud?.kibanaUrl ?? getServerInfoUrl(http);
