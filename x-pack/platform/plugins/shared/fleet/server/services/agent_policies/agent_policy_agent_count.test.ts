/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { getAgentCountForAgentPolicies } from './agent_policy_agent_count';

describe('When using `getAgentCountForAgentPolicies()`', () => {
  let esClientMock: ElasticsearchClientMock;
  let agentPolicyIds: string[];
  let aggrBuckets: Array<{ key: string; doc_count: number }>;

  beforeEach(() => {
    agentPolicyIds = ['agent-policy-id-a', 'agent-policy-id-b'];

    aggrBuckets = [
      {
        key: 'agent-policy-id-a',
        doc_count: 100,
      },
      {
        key: 'agent-policy-id-b',
        doc_count: 50,
      },
    ];

    esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
    esClientMock.search.mockImplementation(async () => {
      const bucketsRecord: Record<string, { doc_count: number }> = {};
      for (const { key, doc_count } of aggrBuckets) {
        bucketsRecord[key] = { doc_count };
      }
      return {
        took: 3,
        timed_out: false,
        _shards: {
          total: 2,
          successful: 2,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: 100,
          max_score: 0,
          hits: [],
        },
        aggregations: {
          agent_counts: {
            buckets: bucketsRecord,
          },
        },
      };
    });
  });

  it('should return an object with counts', async () => {
    await expect(getAgentCountForAgentPolicies(esClientMock, agentPolicyIds)).resolves.toEqual({
      'agent-policy-id-a': 100,
      'agent-policy-id-b': 50,
    });
  });

  it('should always return the policy id count, even if agent counts are not found for it', async () => {
    aggrBuckets = [{ key: 'agent-policy-id-a', doc_count: 100 }];
    esClientMock.search.mockImplementation(async () => ({
      took: 3,
      timed_out: false,
      _shards: { total: 2, successful: 2, skipped: 0, failed: 0 },
      hits: { total: 100, max_score: 0, hits: [] },
      aggregations: {
        agent_counts: {
          buckets: {
            'agent-policy-id-a': { doc_count: 100 },
          },
        },
      },
    }));

    await expect(getAgentCountForAgentPolicies(esClientMock, agentPolicyIds)).resolves.toEqual({
      'agent-policy-id-a': 100,
      'agent-policy-id-b': 0,
    });
  });

  it('should count agents on version-specific policies (e.g. policy#9.3) under the parent policy', async () => {
    esClientMock.search.mockImplementation(async () => ({
      took: 3,
      timed_out: false,
      _shards: { total: 2, successful: 2, skipped: 0, failed: 0 },
      hits: { total: 150, max_score: 0, hits: [] },
      aggregations: {
        agent_counts: {
          buckets: {
            policy1: { doc_count: 150 },
          },
        },
      },
    }));

    await expect(getAgentCountForAgentPolicies(esClientMock, ['policy1'])).resolves.toEqual({
      policy1: 150,
    });
  });
});
