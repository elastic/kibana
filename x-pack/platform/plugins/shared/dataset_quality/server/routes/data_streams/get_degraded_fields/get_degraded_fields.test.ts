/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { createDatasetQualityESClient } from '../../../utils';
import { getDegradedFields } from '.';

jest.mock('../../../utils', () => {
  const actual = jest.requireActual('../../../utils');
  return {
    ...actual,
    createDatasetQualityESClient: jest.fn(),
  };
});

const mockCreateDatasetQualityESClient = createDatasetQualityESClient as jest.MockedFunction<
  typeof createDatasetQualityESClient
>;

describe('getDegradedFields', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockDatasetQualityESClient: {
    search: jest.MockedFunction<ReturnType<typeof createDatasetQualityESClient>['search']>;
    fieldCaps: jest.MockedFunction<ReturnType<typeof createDatasetQualityESClient>['fieldCaps']>;
  };

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    mockDatasetQualityESClient = {
      search: jest.fn(),
      fieldCaps: jest.fn(),
    };
    mockCreateDatasetQualityESClient.mockReturnValue(
      mockDatasetQualityESClient as unknown as ReturnType<typeof createDatasetQualityESClient>
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('issues the search and maps degraded field buckets when _ignored is aggregatable', async () => {
    mockDatasetQualityESClient.fieldCaps.mockResolvedValue({
      fields: {
        _ignored: {
          _ignored: { type: '_ignored', aggregatable: true },
        },
      },
    } as unknown as Awaited<ReturnType<typeof mockDatasetQualityESClient.fieldCaps>>);

    mockDatasetQualityESClient.search.mockResolvedValue({
      aggregations: {
        degradedFields: {
          buckets: [
            {
              key: 'foo.bar',
              doc_count: 7,
              lastOccurrence: { value: 1700000000000 },
              index: { buckets: [{ key: '.ds-logs-foo-2026.01.01-000001' }] },
              timeSeries: {
                buckets: [
                  { key: 1700000000000, doc_count: 3 },
                  { key: 1700000060000, doc_count: 4 },
                ],
              },
            },
          ],
        },
      },
    });

    const result = await getDegradedFields({
      esClient,
      start: 1700000000000,
      end: 1700000120000,
      dataStream: 'logs-foo-default',
    });

    expect(mockDatasetQualityESClient.fieldCaps).toHaveBeenCalledWith({
      index: 'logs-foo-default',
      fields: ['_ignored'],
      include_unmapped: false,
      index_filter: {
        range: {
          '@timestamp': {
            gte: 1700000000000,
            lte: 1700000120000,
            format: 'epoch_millis',
          },
        },
      },
    });
    expect(mockDatasetQualityESClient.search).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      degradedFields: [
        {
          name: 'foo.bar',
          count: 7,
          lastOccurrence: 1700000000000,
          indexFieldWasLastPresentIn: '.ds-logs-foo-2026.01.01-000001',
          timeSeries: [
            { x: 1700000000000, y: 3 },
            { x: 1700000060000, y: 4 },
          ],
        },
      ],
    });
  });

  it('returns empty degradedFields and skips the search when _ignored is not aggregatable', async () => {
    mockDatasetQualityESClient.fieldCaps.mockResolvedValue({
      fields: {
        _ignored: {
          _ignored: { type: '_ignored', aggregatable: false },
        },
      },
    } as unknown as Awaited<ReturnType<typeof mockDatasetQualityESClient.fieldCaps>>);

    const result = await getDegradedFields({
      esClient,
      start: 1700000000000,
      end: 1700000120000,
      dataStream: 'logs-foo-default',
    });

    expect(mockDatasetQualityESClient.search).not.toHaveBeenCalled();
    expect(result).toEqual({ degradedFields: [] });
  });

  it('returns empty degradedFields and skips the search when _ignored is unmapped', async () => {
    mockDatasetQualityESClient.fieldCaps.mockResolvedValue({
      fields: {},
    } as unknown as Awaited<ReturnType<typeof mockDatasetQualityESClient.fieldCaps>>);

    const result = await getDegradedFields({
      esClient,
      start: 1700000000000,
      end: 1700000120000,
      dataStream: 'logs-foo-default',
    });

    expect(mockDatasetQualityESClient.search).not.toHaveBeenCalled();
    expect(result).toEqual({ degradedFields: [] });
  });
});
