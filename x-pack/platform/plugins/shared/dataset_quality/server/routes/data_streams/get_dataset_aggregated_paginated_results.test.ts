/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createDatasetQualityESClient } from '../../utils';
import { getAggregatedDatasetPaginatedResults } from './get_dataset_aggregated_paginated_results';

jest.mock('../../utils', () => ({
  createDatasetQualityESClient: jest.fn(),
}));

const mockCreateDatasetQualityESClient = createDatasetQualityESClient as jest.MockedFunction<
  typeof createDatasetQualityESClient
>;

describe('getAggregatedDatasetPaginatedResults', () => {
  it('chunks concrete data stream names before searching', async () => {
    const search = jest.fn(async ({ index }: { index: string }) => ({
      aggregations: {
        datasets: {
          buckets: index.split(',').map((dataStream) => ({
            key: { dataset: `.ds-${dataStream}-2026.11.10-000001` },
            doc_count: 1,
          })),
        },
      },
    }));
    mockCreateDatasetQualityESClient.mockReturnValue({
      search,
    } as unknown as ReturnType<typeof createDatasetQualityESClient>);

    const dataStreams = Array.from(
      { length: 30 },
      (_, index) => `logs-${'dataset'.repeat(20)}-${index}`
    );

    const results = await getAggregatedDatasetPaginatedResults({
      esClient: {} as ElasticsearchClient,
      index: dataStreams,
      start: 0,
      end: 1,
    });

    expect(search.mock.calls.length).toBeGreaterThan(1);
    expect(results).toHaveLength(dataStreams.length);
    expect(results).toEqual(
      expect.arrayContaining(dataStreams.map((dataset) => ({ dataset, count: 1 })))
    );
  });
});
