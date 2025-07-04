/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import type { CoreSetup } from '@kbn/core/server';

import { fetchAgentMetrics } from './fetch_agent_metrics';

jest.mock('../../collectors/agent_collectors', () => {
  return {
    getAgentUsage: jest.fn().mockResolvedValue({}),
  };
});

describe('fetchAgentMetrics', () => {
  const { createSetup: coreSetupMock } = coreMock;
  const abortController = new AbortController();
  let mockCore: CoreSetup;
  let esClient: ElasticsearchClientMock;

  beforeEach(async () => {
    mockCore = coreSetupMock();
    const [{ elasticsearch }] = await mockCore.getStartServices();
    esClient = elasticsearch.client.asInternalUser as ElasticsearchClientMock;
  });

  it('should not fetch agent if .fleet-agents is not created', async () => {
    esClient.indices.exists.mockResolvedValue(false);

    const result = await fetchAgentMetrics(mockCore, abortController);

    expect(result).toBeUndefined();
  });

  it('should fetch agent metrics', async () => {
    esClient.search.mockResolvedValue({
      took: 5,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 0,
          relation: 'eq',
        },
        hits: [],
      },
      aggregations: {
        versions: {
          buckets: [
            {
              key: '8.12.0',
              doc_count: 1,
            },
          ],
        },
        upgrade_details: {
          buckets: [
            {
              key: 'UPG_REQUESTED',
              doc_count: 1,
            },
          ],
        },
        unhealthy_reason: {
          buckets: [
            {
              key: 'input',
              doc_count: 2,
            },
            {
              key: 'output',
              doc_count: 1,
            },
            {
              key: 'other',
              doc_count: 3,
            },
          ],
        },
      },
    });

    const result = await fetchAgentMetrics(mockCore, abortController);

    expect(result).toEqual({
      agents: {},
      agents_per_version: [
        {
          version: '8.12.0',
          count: 1,
        },
      ],
      upgrading_step: {
        downloading: 0,
        extracting: 0,
        failed: 0,
        replacing: 0,
        requested: 1,
        restarting: 0,
        rollback: 0,
        scheduled: 0,
        watching: 0,
      },
      unhealthy_reason: {
        input: 2,
        output: 1,
        other: 3,
      },
    });
  });
});
