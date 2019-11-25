/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getTraceUrl } from './ExternalLinks';

jest.mock('../../../app/Main/route_config/utils', () => ({
  generatePath: (
    linkToTrace: string,
    pathParam: { traceId: string | number }
  ) => {
    expect(linkToTrace).toBeDefined();
    return `/link-to/trace/${pathParam.traceId}`;
  }
}));

describe('ExternalLinks', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  it('trace link', () => {
    expect(getTraceUrl(123)).toEqual('/link-to/trace/123');
    expect(getTraceUrl('456')).toEqual('/link-to/trace/456');
  });
});
