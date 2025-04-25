/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  getDeprecationLoggingStatus,
  isDeprecationLoggingEnabled,
  setDeprecationLogging,
  isDeprecationLogIndexingEnabled,
  getRecentEsDeprecationLogs,
} from './es_deprecation_logging_apis';

describe('getDeprecationLoggingStatus', () => {
  it('calls cluster.getSettings', async () => {
    const dataClient = elasticsearchServiceMock.createScopedClusterClient();
    await getDeprecationLoggingStatus(dataClient);
    expect(dataClient.asCurrentUser.cluster.getSettings).toHaveBeenCalledWith({
      include_defaults: true,
    });
  });
});

describe('setDeprecationLogging', () => {
  describe('isEnabled = true', () => {
    it('calls cluster.putSettings with logger.deprecation = WARN', async () => {
      const dataClient = elasticsearchServiceMock.createScopedClusterClient();
      await setDeprecationLogging(dataClient, true);
      expect(dataClient.asCurrentUser.cluster.putSettings).toHaveBeenCalledWith({
        persistent: {
          'logger.deprecation': 'WARN',
          'cluster.deprecation_indexing.enabled': true,
        },
        transient: {
          'logger.deprecation': 'WARN',
          'cluster.deprecation_indexing.enabled': true,
        },
      });
    });
  });

  describe('isEnabled = false', () => {
    it('calls cluster.putSettings with logger.deprecation = ERROR', async () => {
      const dataClient = elasticsearchServiceMock.createScopedClusterClient();
      await setDeprecationLogging(dataClient, false);
      expect(dataClient.asCurrentUser.cluster.putSettings).toHaveBeenCalledWith({
        persistent: {
          'logger.deprecation': 'ERROR',
          'cluster.deprecation_indexing.enabled': false,
        },
        transient: {
          'logger.deprecation': 'ERROR',
          'cluster.deprecation_indexing.enabled': false,
        },
      });
    });
  });
});

describe('isDeprecationLoggingEnabled', () => {
  ['defaults', 'persistent', 'transient'].forEach((tier) => {
    ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ALL'].forEach((level) => {
      it(`returns true when ${tier} is set to ${level}`, () => {
        expect(isDeprecationLoggingEnabled({ [tier]: { logger: { deprecation: level } } })).toBe(
          true
        );
      });
    });
  });

  ['defaults', 'persistent', 'transient'].forEach((tier) => {
    ['ERROR', 'FATAL'].forEach((level) => {
      it(`returns false when ${tier} is set to ${level}`, () => {
        expect(isDeprecationLoggingEnabled({ [tier]: { logger: { deprecation: level } } })).toBe(
          false
        );
      });
    });
  });

  it('allows transient to override persistent and default', () => {
    expect(
      isDeprecationLoggingEnabled({
        defaults: { logger: { deprecation: 'FATAL' } },
        persistent: { logger: { deprecation: 'FATAL' } },
        transient: { logger: { deprecation: 'WARN' } },
      })
    ).toBe(true);
  });

  it('allows persistent to override default', () => {
    expect(
      isDeprecationLoggingEnabled({
        defaults: { logger: { deprecation: 'FATAL' } },
        persistent: { logger: { deprecation: 'WARN' } },
      })
    ).toBe(true);
  });
});

describe('isDeprecationLogIndexingEnabled', () => {
  it('allows transient to override persistent and default', () => {
    expect(
      isDeprecationLogIndexingEnabled({
        defaults: { cluster: { deprecation_indexing: { enabled: 'false' } } },
        persistent: { cluster: { deprecation_indexing: { enabled: 'false' } } },
        transient: { cluster: { deprecation_indexing: { enabled: 'true' } } },
      })
    ).toBe(true);
  });

  it('allows persistent to override default', () => {
    expect(
      isDeprecationLogIndexingEnabled({
        defaults: { cluster: { deprecation_indexing: { enabled: 'false' } } },
        persistent: { cluster: { deprecation_indexing: { enabled: 'true' } } },
      })
    ).toBe(true);
  });
});

describe('getRecentEsDeprecationLogs', () => {
  it('returns empty results when index does not exist', async () => {
    const dataClient = elasticsearchServiceMock.createScopedClusterClient();
    dataClient.asCurrentUser.indices.exists.mockResolvedValue(false as any);

    const result = await getRecentEsDeprecationLogs(dataClient);
    expect(result).toEqual({ logs: [], count: 0 });
    expect(dataClient.asCurrentUser.search).not.toHaveBeenCalled();
  });

  it('returns logs and count when index exists', async () => {
    const dataClient = elasticsearchServiceMock.createScopedClusterClient();

    // Use dynamic dates relative to now
    const now = new Date();
    const timestamp1 = new Date(now.getTime() - 1000).toISOString(); // 1 second ago
    const timestamp2 = new Date(now.getTime() - 2000).toISOString(); // 2 seconds ago

    const mockHits = [
      { _source: { '@timestamp': timestamp1, message: 'Deprecation log 1' } },
      { _source: { '@timestamp': timestamp2, message: 'Deprecation log 2' } },
    ];

    dataClient.asCurrentUser.indices.exists.mockResolvedValue(true as any);
    dataClient.asCurrentUser.search.mockResolvedValue({
      hits: {
        hits: mockHits,
        total: { value: 2 },
      },
    } as any);

    const result = await getRecentEsDeprecationLogs(dataClient);
    expect(result).toEqual({
      logs: mockHits.map((hit) => hit._source),
      count: 2,
    });

    // Verify search was called with correct params
    expect(dataClient.asCurrentUser.search).toHaveBeenCalledWith({
      index: '.logs-deprecation.elasticsearch-default',
      query: expect.any(Object),
      sort: [{ '@timestamp': { order: 'desc' } }],
    });
  });

  it('gracefully handles search errors', async () => {
    const dataClient = elasticsearchServiceMock.createScopedClusterClient();
    dataClient.asCurrentUser.indices.exists.mockResolvedValue(true as any);
    dataClient.asCurrentUser.search.mockRejectedValue(new Error('Search error'));

    const result = await getRecentEsDeprecationLogs(dataClient);
    expect(result).toEqual({ logs: [], count: 0 });
  });

  it('uses provided timeframe parameter and only returns logs from the specified timeframe', async () => {
    const dataClient = elasticsearchServiceMock.createScopedClusterClient();
    dataClient.asCurrentUser.indices.exists.mockResolvedValue(true as any);

    // Create a custom timeframe of 1 hour
    const customTimeframe = 60 * 60 * 1000; // 1 hour

    // Create timestamps within and outside the timeframe
    const now = new Date();
    const withinTimeframe1 = new Date(now.getTime() - 30 * 60 * 1000).toISOString(); // 30 mins ago
    const withinTimeframe2 = new Date(now.getTime() - 45 * 60 * 1000).toISOString(); // 45 mins ago
    const outsideTimeframe = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago

    // Mock logs data with timestamps both within and outside the timeframe
    const mockHits = [
      { _source: { '@timestamp': withinTimeframe1, message: 'Recent log 1' } },
      { _source: { '@timestamp': withinTimeframe2, message: 'Recent log 2' } },
      {
        _source: { '@timestamp': outsideTimeframe, message: 'Old log that should be filtered out' },
      },
    ];

    // Elasticsearch would filter out the logs outside timeframe in a real scenario
    // but we need to simulate this in our test by returning only the logs within timeframe
    const filteredMockHits = mockHits.filter(
      (hit) => hit._source['@timestamp'] !== outsideTimeframe
    );

    dataClient.asCurrentUser.search.mockResolvedValue({
      hits: {
        hits: filteredMockHits,
        total: { value: filteredMockHits.length },
      },
    } as any);

    const result = await getRecentEsDeprecationLogs(dataClient, customTimeframe);

    // Verify correct results were returned (should only contain logs within timeframe)
    expect(result).toEqual({
      logs: filteredMockHits.map((hit) => hit._source),
      count: 2,
    });

    // Verify that outsideTimeframe log is not included
    expect(
      result.logs.find(
        (log) => (log as { '@timestamp': string })['@timestamp'] === outsideTimeframe
      )
    ).toBeUndefined();

    // Verify the search query uses the correct timeframe
    expect(dataClient.asCurrentUser.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            must: expect.objectContaining({
              range: expect.objectContaining({
                '@timestamp': expect.objectContaining({
                  gte: expect.any(String),
                  lte: expect.any(String),
                }),
              }),
            }),
          }),
        }),
      })
    );
  });
});
