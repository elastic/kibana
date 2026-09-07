/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import './jest.mocks';

interface MockedHttp {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
}

interface RequestMocks {
  jobs?: unknown;
  createdJob?: unknown;
  indxPatternVldtResp?: Partial<{
    doesMatchIndices: boolean;
    doesMatchRollupIndices: boolean;
    dateFields: string[];
    numericFields: string[];
    keywordFields: string[];
  }>;
}

const mockHttpRequest = (
  http: MockedHttp,
  { jobs = {}, createdJob = {}, indxPatternVldtResp = {} }: RequestMocks = {}
) => {
  http.get.mockImplementation(async (url: string) => {
    if (url === '/api/rollup/jobs') {
      return jobs;
    }

    if (url.startsWith('/api/rollup/index_pattern_validity')) {
      return {
        doesMatchIndices: true,
        doesMatchRollupIndices: false,
        dateFields: ['foo', 'bar'],
        numericFields: [],
        keywordFields: [],
        ...indxPatternVldtResp,
      };
    }

    return {};
  });

  // mock '/api/rollup/start'
  http.post.mockImplementation(async (_url: string) => ({}));

  // mock '/api/rollup/create
  http.put.mockImplementation(async (_url: string) => createdJob);
};

export { mockHttpRequest };
