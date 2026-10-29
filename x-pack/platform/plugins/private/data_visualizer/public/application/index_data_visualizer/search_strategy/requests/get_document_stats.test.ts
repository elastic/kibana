/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { estypes } from '@elastic/elasticsearch';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ISearchOptions } from '@kbn/search-types';
import type { OverallStatsSearchStrategyParams } from '../../../../../common/types/field_stats';
import { getDocumentCountStats } from './get_document_stats';

const EARLIEST = 1454889600000;

const searchParams = {
  index: 'farequote-*',
  timeFieldName: '@timestamp',
  earliest: EARLIEST,
  latest: 1455235200000,
  intervalMs: 3600000,
  searchQuery: { match_all: {} },
} as OverallStatsSearchStrategyParams;

const searchOptions: ISearchOptions = {};

const samplerResponse = (sampledDocCount: number, total: estypes.SearchHitsMetadata['total']) => ({
  rawResponse: {
    took: 1,
    hits: { total },
    aggregations: {
      sampler: {
        doc_count: sampledDocCount,
        eventRate: { buckets: [{ key: EARLIEST, doc_count: sampledDocCount }] },
      },
    },
  },
});

const createSearchMock = (responses: Array<ReturnType<typeof samplerResponse>>) => {
  const search = jest.fn();
  responses.forEach((response) => search.mockReturnValueOnce(of(response)));
  return { search } as unknown as DataPublicPluginStart['search'];
};

const getRequestParams = (search: DataPublicPluginStart['search'], callIndex: number) =>
  (search.search as unknown as jest.Mock).mock.calls[callIndex][0].params;

describe('getDocumentCountStats', () => {
  test('runs an unsampled aggregation when the matched doc count is below the sampling threshold', async () => {
    // A probe at probability 0.000001 can return a handful of documents even for a small data set,
    // which the derived probability would extrapolate into a data set worth sampling.
    const search = createSearchMock([
      samplerResponse(6, { value: 34415, relation: 'eq' }),
      samplerResponse(34415, { value: 0, relation: 'eq' }),
    ]);

    const stats = await getDocumentCountStats(search, searchParams, searchOptions, 'seed');

    expect(getRequestParams(search, 0).track_total_hits).toBe(100000);
    expect(getRequestParams(search, 1).aggs.sampler.random_sampler.probability).toBe(1);
    expect(stats).toEqual(
      expect.objectContaining({ randomlySampled: false, probability: 1, totalCount: 34415 })
    );
  });

  test('derives a sampling probability when the matched doc count is capped at the threshold', async () => {
    const search = createSearchMock([
      samplerResponse(6, { value: 100000, relation: 'gte' }),
      samplerResponse(3608, { value: 0, relation: 'eq' }),
    ]);

    const stats = await getDocumentCountStats(search, searchParams, searchOptions, 'seed');

    expect(getRequestParams(search, 1).aggs.sampler.random_sampler.probability).toBe(0.1);
    expect(stats).toEqual(
      expect.objectContaining({ randomlySampled: true, probability: 0.1, totalCount: 3608 })
    );
  });

  test('does not track the matched doc count when the caller pins a probability', async () => {
    const search = createSearchMock([samplerResponse(34415, { value: 0, relation: 'eq' })]);

    const stats = await getDocumentCountStats(search, searchParams, searchOptions, 'seed', 1);

    expect(getRequestParams(search, 0).track_total_hits).toBe(false);
    expect(search.search).toHaveBeenCalledTimes(1);
    expect(stats).toEqual(
      expect.objectContaining({ randomlySampled: false, probability: 1, totalCount: 34415 })
    );
  });
});
