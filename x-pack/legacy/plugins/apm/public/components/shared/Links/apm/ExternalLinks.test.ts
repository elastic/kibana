/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getTraceUrl } from './ExternalLinks';

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
    expect(getTraceUrl(123)).toEqual('/link-to/trace/123');
    expect(getTraceUrl('456')).toEqual('/link-to/trace/456');
  });
  it('trace link with dates', () => {
    expect(getTraceUrl(123, { rangeFrom: '123', rangeTo: '456' })).toEqual(
      '/link-to/trace/123?rangeFrom=123&rangeTo=456'
    );
  });
});
