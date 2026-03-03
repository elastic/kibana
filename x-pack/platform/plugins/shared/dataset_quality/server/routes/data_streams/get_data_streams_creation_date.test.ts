/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { dataStreamService } from '../../services';
import { getDataStreamsCreationDate } from './get_data_streams_creation_date';

jest.mock('../../services');

const mockDataStreamService = dataStreamService as jest.Mocked<typeof dataStreamService>;

describe('getDataStreamsCreationDate', () => {
  let mockESClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    mockESClient = elasticsearchServiceMock.createElasticsearchClient();
    jest.clearAllMocks();
  });

  it('returns empty object when dataStreams array is empty', async () => {
    const result = await getDataStreamsCreationDate({
      esClient: mockESClient,
      dataStreams: [],
    });

    expect(result).toEqual({});
    expect(mockDataStreamService.getMatchingDataStreams).not.toHaveBeenCalled();
    expect(mockESClient.cat.indices).not.toHaveBeenCalled();
  });

  it('returns empty object when no matching data streams found', async () => {
    mockDataStreamService.getMatchingDataStreams.mockResolvedValue([]);

    const result = await getDataStreamsCreationDate({
      esClient: mockESClient,
      dataStreams: ['logs-test-default'],
    });

    expect(result).toEqual({});
    expect(mockESClient.cat.indices).not.toHaveBeenCalled();
  });

  it('returns creation dates for data streams', async () => {
    mockDataStreamService.getMatchingDataStreams.mockResolvedValue([
      {
        name: 'logs-test-default',
        indices: [{ index_name: '.ds-logs-test-default-2024.01.01-000001' }],
      },
      {
        name: 'logs-nginx-default',
        indices: [{ index_name: '.ds-logs-nginx-default-2024.01.01-000001' }],
      },
    ] as any);

    mockESClient.cat.indices.mockResolvedValue([
      {
        'creation.date': '1704067200000',
        index: '.ds-logs-test-default-2024.01.01-000001',
      },
      {
        'creation.date': '1704153600000',
        index: '.ds-logs-nginx-default-2024.01.01-000001',
      },
    ]);

    const result = await getDataStreamsCreationDate({
      esClient: mockESClient,
      dataStreams: ['logs-test-default', 'logs-nginx-default'],
    });

    expect(result).toEqual({
      'logs-test-default': 1704067200000,
      'logs-nginx-default': 1704153600000,
    });
  });

  it('handles undefined creation dates', async () => {
    mockDataStreamService.getMatchingDataStreams.mockResolvedValue([
      {
        name: 'logs-test-default',
        indices: [{ index_name: '.ds-logs-test-default-2024.01.01-000001' }],
      },
    ] as any);

    mockESClient.cat.indices.mockResolvedValue([
      {
        'creation.date': undefined,
        index: '.ds-logs-test-default-2024.01.01-000001',
      },
    ]);

    const result = await getDataStreamsCreationDate({
      esClient: mockESClient,
      dataStreams: ['logs-test-default'],
    });

    expect(result).toEqual({
      'logs-test-default': undefined,
    });
  });

  describe('chunking behavior', () => {
    it('chunks data stream requests to avoid URL length limits', async () => {
      const longNamedDataStreams = Array.from(
        { length: 100 },
        (_, i) =>
          `logs-very-long-data-stream-name-for-testing-chunking-${i
            .toString()
            .padStart(3, '0')}-default`
      );

      mockDataStreamService.getMatchingDataStreams.mockImplementation(async (_, names) => {
        const namesArray = Array.isArray(names) ? names : [names];
        return namesArray.map((name) => ({
          name,
          indices: [{ index_name: `.ds-${name}-2024.01.01-000001` }],
        })) as any;
      });

      mockESClient.cat.indices.mockImplementation(async ({ index }) => {
        const indices = Array.isArray(index) ? index : [index];
        return indices.map((idx) => ({
          'creation.date': '1704067200000',
          index: idx,
        }));
      });

      const result = await getDataStreamsCreationDate({
        esClient: mockESClient,
        dataStreams: longNamedDataStreams,
      });

      expect(mockDataStreamService.getMatchingDataStreams.mock.calls.length).toBeGreaterThan(1);
      expect(mockESClient.cat.indices.mock.calls.length).toBeGreaterThan(1);
      expect(Object.keys(result)).toHaveLength(100);
    });

    it('merges results from multiple chunks correctly', async () => {
      const dataStreams = Array.from({ length: 100 }, (_, i) => `logs-stream-${i}-default`);

      mockDataStreamService.getMatchingDataStreams.mockImplementation(async (_, names) => {
        const namesArray = Array.isArray(names) ? names : [names];
        return namesArray.map((name) => ({
          name,
          indices: [{ index_name: `.ds-${name}-2024.01.01-000001` }],
        })) as any;
      });

      mockESClient.cat.indices.mockImplementation(async ({ index }) => {
        const indices = Array.isArray(index) ? index : [index];
        return indices.map((idx, i) => ({
          'creation.date': String(1704067200000 + i * 86400000),
          index: idx,
        }));
      });

      const result = await getDataStreamsCreationDate({
        esClient: mockESClient,
        dataStreams,
      });

      expect(Object.keys(result)).toHaveLength(100);
      dataStreams.forEach((ds) => {
        expect(result[ds]).toBeDefined();
      });
    });
  });
});
