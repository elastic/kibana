/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import { agentPolicyService } from '../../services';

import type { FleetRequestHandlerContext } from '../..';
import { xpackMocks } from '../../mocks';
import type { AgentClient } from '../../services/agents';
import type { AgentPolicy } from '../../types';

import {
  bulkGetAgentPoliciesHandler,
  GetListAgentPolicyOutputsHandler,
  populateAssignedAgentsCount,
} from './handlers';

jest.mock('../../services/agent_policy', () => {
  return {
    agentPolicyService: {
      getByIds: jest.fn(),
      listAllOutputsForPolicies: jest.fn(),
    },
  };
});

const agentPolicyServiceMock = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

describe('Agent policy API handlers', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(async () => {
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
  });

  describe('GetListAgentPolicyOutputsHandler', () => {
    it('should deduplicate ids', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          ids: ['1', '1'],
        },
      });
      await GetListAgentPolicyOutputsHandler(context, request, response);
      expect(agentPolicyServiceMock.getByIds).toHaveBeenCalledWith(
        expect.anything(),
        ['1'],
        expect.anything()
      );
    });
  });

  describe('bulkGetAgentPoliciesHandler', () => {
    it('should deduplicate ids', async () => {
      agentPolicyServiceMock.getByIds.mockResolvedValueOnce([]);
      const request = httpServerMock.createKibanaRequest({
        body: {
          ids: ['1', '1'],
        },
      });
      await bulkGetAgentPoliciesHandler(context, request, response);
      expect(agentPolicyServiceMock.getByIds).toHaveBeenCalledWith(
        expect.anything(),
        ['1'],
        expect.anything()
      );
    });
  });

  describe('populateAssignedAgentsCount', () => {
    const makeAgentClient = (
      listAgents: jest.Mock
    ): { agentClient: AgentClient; listAgents: jest.Mock } => ({
      agentClient: { listAgents } as unknown as AgentClient,
      listAgents,
    });

    it('does not query agents when there are no policies', async () => {
      const { agentClient, listAgents } = makeAgentClient(jest.fn());

      await populateAssignedAgentsCount(agentClient, []);

      expect(listAgents).not.toHaveBeenCalled();
    });

    it('populates counts for every policy from a single bucketed aggregation', async () => {
      const listAgents = jest.fn().mockResolvedValue({
        aggregations: {
          policies: {
            buckets: {
              'policy-1': {
                doc_count: 5,
                unprivileged: { doc_count: 2 },
                fips: { doc_count: 1 },
                versions: {
                  buckets: [
                    { key: '8.0.0', doc_count: 3 },
                    { key: '8.1.0', doc_count: 2 },
                  ],
                },
              },
              // policy-2 has no matching agents
              'policy-2': {
                doc_count: 0,
                unprivileged: { doc_count: 0 },
                fips: { doc_count: 0 },
                versions: { buckets: [] },
              },
            },
          },
        },
      });
      const { agentClient } = makeAgentClient(listAgents);

      const agentPolicies = [{ id: 'policy-1' }, { id: 'policy-2' }] as AgentPolicy[];

      await populateAssignedAgentsCount(agentClient, agentPolicies);

      // Only a single agents query is issued regardless of the number of policies
      expect(listAgents).toHaveBeenCalledTimes(1);
      const listAgentsArgs = listAgents.mock.calls[0][0];
      expect(listAgentsArgs.perPage).toBe(0);
      // One filter bucket per policy
      expect(Object.keys(listAgentsArgs.aggregations.policies.filters.filters)).toEqual([
        'policy-1',
        'policy-2',
      ]);

      expect(agentPolicies[0]).toEqual(
        expect.objectContaining({
          agents: 5,
          unprivileged_agents: 2,
          fips_agents: 1,
          agents_per_version: [
            { version: '8.0.0', count: 3 },
            { version: '8.1.0', count: 2 },
          ],
        })
      );
      expect(agentPolicies[1]).toEqual(
        expect.objectContaining({
          agents: 0,
          unprivileged_agents: 0,
          fips_agents: 0,
          agents_per_version: [],
        })
      );
    });

    it('defaults counts to zero when a policy has no aggregation bucket', async () => {
      const listAgents = jest.fn().mockResolvedValue({
        aggregations: { policies: { buckets: {} } },
      });
      const { agentClient } = makeAgentClient(listAgents);

      const agentPolicies = [{ id: 'policy-without-bucket' }] as AgentPolicy[];

      await populateAssignedAgentsCount(agentClient, agentPolicies);

      expect(agentPolicies[0]).toEqual(
        expect.objectContaining({
          agents: 0,
          unprivileged_agents: 0,
          fips_agents: 0,
          agents_per_version: [],
        })
      );
    });
  });
});
