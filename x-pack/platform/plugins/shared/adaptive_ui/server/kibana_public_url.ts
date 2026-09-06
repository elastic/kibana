/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addSpaceIdToPath } from '@kbn/core-spaces-common';

export interface KibanaPublicUrlHttp {
  basePath: {
    readonly publicBaseUrl?: string;
    readonly serverBasePath?: string;
    prepend: (path: string) => string;
  };
  getServerInfo: () => { protocol: string; hostname: string; port: number };
}

/** Space-aware public Kibana origin from `http.basePath.publicBaseUrl`, else `getServerInfo` plus `basePath.prepend`. */
export const getKibanaPublicUrl = ({
  http,
  spaceId,
}: {
  http: KibanaPublicUrlHttp;
  spaceId: string;
}): string => {
  const { publicBaseUrl, prepend } = http.basePath;
  const { protocol, hostname, port } = http.getServerInfo();
  const origin = (
    publicBaseUrl ?? `${protocol}://${hostname}:${port}${prepend('/').slice(0, -1)}`
  ).replace(/\/$/, '');
  return addSpaceIdToPath(origin, spaceId);
};
