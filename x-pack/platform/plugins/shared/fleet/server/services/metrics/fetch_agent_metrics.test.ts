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
    esClient.esql.query.mockResolvedValueOnce({
      values: [[1, '8.12.0']],
    } as any);
    esClient.esql.query.mockResolvedValueOnce({
      values: [[1, 'UPG_REQUESTED']],
    } as any);
    esClient.esql.query.mockResolvedValueOnce({
      values: [
        [2, 'input'],
        [1, 'output'],
        [3, 'other'],
      ],
    } as any);

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
