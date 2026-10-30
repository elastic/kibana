/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart } from '@kbn/core/server';
import { getKibanaBaseUrl } from './kibana_base_url';

const createHttp = ({
  publicBaseUrl,
  serverBasePath = '',
}: {
  publicBaseUrl?: string;
  serverBasePath?: string;
} = {}): Pick<HttpServiceStart, 'basePath' | 'getServerInfo'> => ({
  basePath: {
    publicBaseUrl,
    prepend: (path: string) => `${serverBasePath}${path}`,
  } as HttpServiceStart['basePath'],
  getServerInfo: () => ({
    name: 'kibana',
    hostname: 'localhost',
    port: 5601,
    protocol: 'http',
  }),
});

describe('getKibanaBaseUrl', () => {
  it('prefers publicBaseUrl', () => {
    expect(
      getKibanaBaseUrl(createHttp({ publicBaseUrl: 'https://public.example.com' }), {
        kibanaUrl: 'https://cloud.example.com',
      })
    ).toBe('https://public.example.com');
  });

  it('falls back to the cloud Kibana URL', () => {
    expect(getKibanaBaseUrl(createHttp(), { kibanaUrl: 'https://cloud.example.com' })).toBe(
      'https://cloud.example.com'
    );
  });

  it('falls back to server info including the server base path', () => {
    expect(getKibanaBaseUrl(createHttp({ serverBasePath: '/abc' }))).toBe(
      'http://localhost:5601/abc'
    );
  });
});
