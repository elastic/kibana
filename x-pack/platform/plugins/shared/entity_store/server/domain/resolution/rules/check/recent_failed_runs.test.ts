/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { countRecentFailedRuns } from './recent_failed_runs';

describe('countRecentFailedRuns', () => {
  it('counts failure records of the past 24 hours in the namespace stream', async () => {
    const count = jest.fn().mockResolvedValue({ count: 3 });

    const result = await countRecentFailedRuns({
      esClient: { count } as unknown as ElasticsearchClient,
      namespace: 'default',
      logger: loggerMock.create(),
    });

    expect(result).toBe(3);
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.entities.v2.resolution_runs.default',
        query: {
          bool: {
            filter: [
              { term: { 'event.outcome': 'failure' } },
              { range: { '@timestamp': { gte: 'now-24h' } } },
            ],
          },
        },
      })
    );
  });

  it('returns null, not zero, when the stream cannot be read', async () => {
    const esClient = {
      count: jest.fn().mockRejectedValue(new Error('security_exception')),
    } as unknown as ElasticsearchClient;

    await expect(
      countRecentFailedRuns({ esClient, namespace: 'default', logger: loggerMock.create() })
    ).resolves.toBeNull();
  });
});
