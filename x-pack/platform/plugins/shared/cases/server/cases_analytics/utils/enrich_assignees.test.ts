/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { enrichAssigneesInContentIndex } from './enrich_assignees';
import { DOC_TYPES } from '../content_index/constants';

const mockLogger = loggingSystemMock.createLogger();

function makeMockEsClient(overrides: Partial<ElasticsearchClient> = {}): jest.Mocked<ElasticsearchClient> {
  return {
    search: jest.fn(),
    updateByQuery: jest.fn().mockResolvedValue({}),
    security: {
      getUserProfile: jest.fn(),
    },
    ...overrides,
  } as unknown as jest.Mocked<ElasticsearchClient>;
}

const BASE_PARAMS = {
  logger: mockLogger,
  destIndex: '.internal.cases-analytics.securitysolution-default',
  spaceId: 'default',
  owner: 'securitySolution',
  executionId: 'test-exec-id',
};

describe('enrichAssigneesInContentIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns early when no case docs with assignees exist', async () => {
    const esClient = makeMockEsClient({
      search: jest.fn().mockResolvedValue({
        aggregations: { uids: { buckets: [] } },
      }),
    });

    await enrichAssigneesInContentIndex({ esClient, ...BASE_PARAMS });

    expect(esClient.security.getUserProfile).not.toHaveBeenCalled();
    expect(esClient.updateByQuery).not.toHaveBeenCalled();
  });

  it('fetches profiles and dispatches updateByQuery when assignees are found', async () => {
    const esClient = makeMockEsClient({
      search: jest.fn().mockResolvedValue({
        aggregations: { uids: { buckets: [{ key: 'uid-1' }, { key: 'uid-2' }] } },
      }),
    });

    (esClient.security.getUserProfile as jest.Mock).mockResolvedValue({
      profiles: [
        { uid: 'uid-1', user: { username: 'alice', email: 'alice@example.com', full_name: 'Alice' } },
        { uid: 'uid-2', user: { username: 'bob', email: 'bob@example.com', full_name: 'Bob' } },
      ],
    });

    (esClient.updateByQuery as jest.Mock).mockResolvedValue({});

    await enrichAssigneesInContentIndex({ esClient, ...BASE_PARAMS });

    expect(esClient.security.getUserProfile).toHaveBeenCalledWith({ uid: ['uid-1', 'uid-2'] });

    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: BASE_PARAMS.destIndex,
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([
              { term: { doc_type: DOC_TYPES.CASE } },
              { term: { owner: BASE_PARAMS.owner } },
              { term: { space_ids: BASE_PARAMS.spaceId } },
            ]),
          }),
        }),
        script: expect.objectContaining({
          lang: 'painless',
          params: {
            profiles: {
              'uid-1': { username: 'alice', email: 'alice@example.com', full_name: 'Alice' },
              'uid-2': { username: 'bob', email: 'bob@example.com', full_name: 'Bob' },
            },
          },
        }),
        wait_for_completion: false,
      })
    );
  });

  it('returns early without calling updateByQuery when security API returns no profiles', async () => {
    const esClient = makeMockEsClient({
      search: jest.fn().mockResolvedValue({
        aggregations: { uids: { buckets: [{ key: 'uid-unknown' }] } },
      }),
    });

    (esClient.security.getUserProfile as jest.Mock).mockResolvedValue({ profiles: [] });

    await enrichAssigneesInContentIndex({ esClient, ...BASE_PARAMS });

    expect(esClient.updateByQuery).not.toHaveBeenCalled();
  });

  it('logs a warning and continues when the security API batch call fails', async () => {
    const esClient = makeMockEsClient({
      search: jest.fn().mockResolvedValue({
        aggregations: { uids: { buckets: [{ key: 'uid-1' }] } },
      }),
    });

    const securityError = new Error('security API unavailable');
    (esClient.security.getUserProfile as jest.Mock).mockRejectedValue(securityError);

    await expect(
      enrichAssigneesInContentIndex({ esClient, ...BASE_PARAMS })
    ).resolves.toBeUndefined();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch user profile batch'),
      expect.objectContaining({ error: securityError })
    );
    expect(esClient.updateByQuery).not.toHaveBeenCalled();
  });

  it('logs a warning and does not throw when the top-level search fails', async () => {
    const searchError = new Error('ES search failed');
    const esClient = makeMockEsClient({
      search: jest.fn().mockRejectedValue(searchError),
    });

    // FAILURE SCENARIO: The initial aggregation query throws.
    // Expected: warning logged, no updateByQuery, function resolves.
    await expect(
      enrichAssigneesInContentIndex({ esClient, ...BASE_PARAMS })
    ).resolves.toBeUndefined();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Assignee enrichment failed'),
      expect.objectContaining({ error: searchError })
    );
    expect(esClient.updateByQuery).not.toHaveBeenCalled();
  });

  it('logs a warning and does not throw when updateByQuery rejects', async () => {
    const esClient = makeMockEsClient({
      search: jest.fn().mockResolvedValue({
        aggregations: { uids: { buckets: [{ key: 'uid-1' }] } },
      }),
    });

    (esClient.security.getUserProfile as jest.Mock).mockResolvedValue({
      profiles: [
        { uid: 'uid-1', user: { username: 'alice', email: null, full_name: null } },
      ],
    });

    const updateError = new Error('updateByQuery failed');
    // FAILURE SCENARIO: The updateByQuery rejects after being dispatched.
    // Expected: warning from .catch handler, function resolves (fire-and-forget).
    (esClient.updateByQuery as jest.Mock).mockRejectedValue(updateError);

    await expect(
      enrichAssigneesInContentIndex({ esClient, ...BASE_PARAMS })
    ).resolves.toBeUndefined();

    // Allow the promise microtask to flush
    await new Promise((r) => setTimeout(r, 0));

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('updateByQuery for assignee enrichment failed'),
      expect.objectContaining({ error: updateError })
    );
  });
});
