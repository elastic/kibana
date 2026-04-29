/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paramsMock } from './__mocks__/params_match_all';

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { topCategoriesSearchResponseMock } from './__mocks__/top_categories_search_response';
import { topCategoriesResultMock } from './__mocks__/top_categories_result';
import { fetchTopCategories } from './fetch_top_categories';

const esClientMock = {
  msearch: jest.fn().mockImplementation(() => topCategoriesSearchResponseMock),
} as unknown as ElasticsearchClient;

const loggerMock = {} as unknown as Logger;

describe('fetchTopCategories', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch top categories successfully', async () => {
    const abortSignal = new AbortController().signal;

    const result = await fetchTopCategories({
      esClient: esClientMock,
      logger: loggerMock,
      emitError: jest.fn(),
      abortSignal,
      arguments: { ...paramsMock, fieldNames: ['message'] },
    });
    expect(result).toEqual(topCategoriesResultMock);
    expect(esClientMock.msearch).toHaveBeenCalledWith(
      {
        searches: [
          { index: 'the-index' },
          {
            aggs: {
              categories: {
                aggs: {
                  examples: {
                    top_hits: { _source: 'message', size: 4, sort: ['the-time-field-name'] },
                  },
                },
                categorize_text: { field: 'message', size: 1000 },
              },
            },
            query: {
              bool: {
                filter: [
                  {
                    bool: {
                      should: [
                        {
                          range: {
                            'the-time-field-name': {
                              format: 'epoch_millis',
                              gte: 10,
                              lte: 20,
                            },
                          },
                        },
                        {
                          range: {
                            'the-time-field-name': {
                              format: 'epoch_millis',
                              gte: 30,
                              lte: 40,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            size: 0,
          },
        ],
      },
      { maxRetries: 0, signal: abortSignal }
    );
  });
});
