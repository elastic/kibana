/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getTraceUrl } from './ExternalLinks';
import { IBasePath } from 'kibana/server';

jest.mock('../../../app/Main/route_config/index.tsx', () => ({
  routes: [
    {
      name: 'link_to_trace',
      path: '/link-to/trace/:traceId'
    }
  ]
}));

describe('ExternalLinks', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  it('trace link', () => {
    const kibanaBasePath = {
      prepend: apmPath => apmPath
    } as IBasePath;
    expect(getTraceUrl(kibanaBasePath, 123)).toEqual(
      '/apm/apm#/link-to/trace/123'
    );
    expect(getTraceUrl(kibanaBasePath, '456')).toEqual(
      '/apm/apm#/link-to/trace/456'
    );
  });
});
