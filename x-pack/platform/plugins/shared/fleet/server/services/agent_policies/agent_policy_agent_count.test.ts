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

  beforeEach(() => {
    agentPolicyIds = ['agent-policy-id-a', 'agent-policy-id-b'];

    esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;

    esClientMock.esql.query.mockResolvedValue({
      values: [
        [100, 'agent-policy-id-a'],
        [50, 'agent-policy-id-b'],
      ],
    } as any);
  });

  it('should return an object with counts', async () => {
    await expect(getAgentCountForAgentPolicies(esClientMock, agentPolicyIds)).resolves.toEqual({
      'agent-policy-id-a': 100,
      'agent-policy-id-b': 50,
    });
  });

  it('should always return the policy id count, even if agent counts are not found for it', async () => {
    esClientMock.esql.query.mockResolvedValue({
      values: [[100, 'agent-policy-id-a']],
    } as any);

    await expect(getAgentCountForAgentPolicies(esClientMock, agentPolicyIds)).resolves.toEqual({
      'agent-policy-id-a': 100,
      'agent-policy-id-b': 0,
    });
  });
});
