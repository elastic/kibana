/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { getAgentIdsForAgentPolicies } from './agent_policies_to_agent_ids';

describe('getAgentIdsForAgentPolicies', () => {
  let esClientMock: ElasticsearchClientMock;
  let agentPolicyIds: string[];
  let agents: Array<{ _index: string; _id: string; _score: number }>;

  beforeEach(() => {
    agentPolicyIds = ['agent-policy-id-a', 'agent-policy-id-b'];

    agents = [
      {
        _index: '.fleet-agents-7',
        _id: 'agent-id-a',
        _score: 0,
      },
      {
        _index: '.fleet-agents-7',
        _id: 'agent-id-b',
        _score: 0,
      },
      {
        _index: '.fleet-agents-7',
        _id: 'agent-id-c',
        _score: 0,
      },
    ];

    esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
    esClientMock.search.mockImplementation(async () => {
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
          hits: agents,
        },
      };
    });
  });

  it('should return an array of agent ids', async () => {
    expect(await getAgentIdsForAgentPolicies(esClientMock, agentPolicyIds)).toEqual([
      'agent-id-a',
      'agent-id-b',
      'agent-id-c',
    ]);
  });

  it('should return an empty array if no agents were found', async () => {
    agents = [];
    expect(await getAgentIdsForAgentPolicies(esClientMock, agentPolicyIds)).toEqual([]);
  });
});
