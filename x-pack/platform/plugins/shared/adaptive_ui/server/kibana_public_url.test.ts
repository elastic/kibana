/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKibanaPublicUrl, type KibanaPublicUrlHttp } from './kibana_public_url';

const createHttp = ({
  publicBaseUrl,
  prepend = (path) => `/xyz${path}`,
}: {
  publicBaseUrl?: string;
  prepend?: (path: string) => string;
}): KibanaPublicUrlHttp => ({
  basePath: { publicBaseUrl, prepend },
  getServerInfo: () => ({
    hostname: 'localhost',
    port: 5601,
    protocol: 'http',
  }),
});

describe('getKibanaPublicUrl', () => {
  it('uses publicBaseUrl and omits a prefix for the default space', () => {
    expect(
      getKibanaPublicUrl({
        http: createHttp({ publicBaseUrl: 'https://kibana.example.com/xyz' }),
        spaceId: 'default',
      })
    ).toBe('https://kibana.example.com/xyz');
  });

  it('inserts the space prefix for a named space', () => {
    expect(
      getKibanaPublicUrl({
        http: createHttp({ publicBaseUrl: 'https://kibana.example.com/xyz' }),
        spaceId: 'sec',
      })
    ).toBe('https://kibana.example.com/xyz/s/sec');
  });

  it('falls back to getServerInfo and basePath.prepend when publicBaseUrl is unset', () => {
    expect(
      getKibanaPublicUrl({
        http: createHttp({ publicBaseUrl: undefined }),
        spaceId: 'default',
      })
    ).toBe('http://localhost:5601/xyz');
  });
});
