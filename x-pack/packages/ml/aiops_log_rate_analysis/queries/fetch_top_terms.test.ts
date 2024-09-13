/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paramsMock } from './__mocks__/params_match_all';

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { topTermsSearchResponseMock } from './__mocks__/top_terms_search_response';
import { topTermsResult } from './__mocks__/top_terms_result';
import { fetchTopTerms } from './fetch_top_terms';

const esClientMock = {
  search: jest.fn().mockImplementation(() => topTermsSearchResponseMock),
} as unknown as ElasticsearchClient;

const loggerMock = {} as unknown as Logger;

describe('fetchTopTerms', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch top terms successfully', async () => {
    const abortSignal = new AbortController().signal;

    const result = await fetchTopTerms({
      esClient: esClientMock,
      logger: loggerMock,
      emitError: jest.fn(),
      abortSignal,
      arguments: {
        ...paramsMock,
        fieldNames: [
          'agent.keyword',
          'clientip',
          'event.dataset',
          'extension.keyword',
          'geo.dest',
          'geo.src',
          'geo.srcdest',
          'host.keyword',
          'index.keyword',
          'ip',
          'machine.os.keyword',
          'referer',
          'request.keyword',
          'response.keyword',
          'tags.keyword',
          'url.keyword',
        ],
      },
    });

    expect(esClientMock.search).toHaveBeenCalledTimes(1);
    expect(result).toEqual(topTermsResult);
  });
});
