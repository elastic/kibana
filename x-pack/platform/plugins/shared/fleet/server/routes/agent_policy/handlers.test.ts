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
  getFullAgentPolicy,
  GetListAgentPolicyOutputsHandler,
  populateAssignedAgentsCount,
} from './handlers';

jest.mock('../../services/agent_policy', () => {
  return {
    agentPolicyService: {
      getByIds: jest.fn(),
      listAllOutputsForPolicies: jest.fn(),
      getFullAgentPolicy: jest.fn(),
      getFullAgentConfigMap: jest.fn(),
    },
  };
});

jest.mock('../../services/agent_policy_create', () => {
  return {
    createAgentPolicyWithPackages: jest.fn(),
  };
});

jest.mock('../../services/fleet_proxies', () => ({
  listFleetProxies: jest.fn().mockResolvedValue({ items: [] }),
}));

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

  describe('getFullAgentPolicy / downloadFullAgentPolicy — proxy secret redaction', () => {
    const POLICY_WITH_SECRETS = {
      id: 'policy-1',
      outputs: {
        default: {
          type: 'elasticsearch',
          hosts: ['https://es:9200'],
          proxy_url: 'https://proxy.fr',
          proxy_headers: { Authorization: 'Bearer SECRET' },
          ssl: { key: 'PRIVATE_KEY', certificate: 'my-cert' },
        },
      },
      fleet: {
        hosts: ['https://fleet:8220'],
        proxy_url: 'https://proxy.fr',
        proxy_headers: { Authorization: 'Bearer SECRET' },
        ssl: { key: 'PRIVATE_KEY' },
      },
      agent: {
        download: {
          sourceURI: 'https://artifacts.elastic.co',
          proxy_headers: { Authorization: 'Bearer SECRET' },
          ssl: { key: 'PRIVATE_KEY' },
        },
        monitoring: { enabled: false, metrics: false, logs: false, traces: false },
        features: {},
        protection: { enabled: false, uninstall_token_hash: '', signing_key: '' },
      },
      inputs: [],
      revision: 2,
      signed: { data: '', signature: '' },
      secret_references: [],
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('main composition path (no kubernetes)', () => {
      it('passes redactProxySecrets:true when caller lacks fleet-settings-read', async () => {
        const fleetContext = (await context.fleet) as any;
        fleetContext.authz.fleet.readSettings = false;
        agentPolicyServiceMock.getFullAgentPolicy.mockResolvedValue(POLICY_WITH_SECRETS as any);

        const request = httpServerMock.createKibanaRequest({
          params: { agentPolicyId: 'policy-1' },
          query: {},
        });

        await getFullAgentPolicy(context, request, response);

        expect(agentPolicyServiceMock.getFullAgentPolicy).toHaveBeenCalledWith(
          expect.anything(),
          'policy-1',
          expect.objectContaining({ redactProxySecrets: true })
        );
      });

      it('passes redactProxySecrets:false when caller has fleet-settings-read', async () => {
        const fleetContext = (await context.fleet) as any;
        fleetContext.authz.fleet.readSettings = true;
        agentPolicyServiceMock.getFullAgentPolicy.mockResolvedValue(POLICY_WITH_SECRETS as any);

        const request = httpServerMock.createKibanaRequest({
          params: { agentPolicyId: 'policy-1' },
          query: {},
        });

        await getFullAgentPolicy(context, request, response);

        expect(agentPolicyServiceMock.getFullAgentPolicy).toHaveBeenCalledWith(
          expect.anything(),
          'policy-1',
          expect.objectContaining({ redactProxySecrets: false })
        );
      });
    });

    describe('?kubernetes=true branch', () => {
      it('passes redactProxySecrets:true to getFullAgentConfigMap when caller lacks fleet-settings-read', async () => {
        const fleetContext = (await context.fleet) as any;
        fleetContext.authz.fleet.readSettings = false;
        fleetContext.agentClient.asInternalUser.getLatestAgentAvailableDockerImageVersion.mockResolvedValue(
          '9.6.0'
        );
        agentPolicyServiceMock.getFullAgentConfigMap.mockResolvedValue('configmap-yaml');

        const request = httpServerMock.createKibanaRequest({
          params: { agentPolicyId: 'policy-1' },
          query: { kubernetes: true },
        });

        await getFullAgentPolicy(context, request, response);

        expect(agentPolicyServiceMock.getFullAgentConfigMap).toHaveBeenCalledWith(
          expect.anything(),
          'policy-1',
          '9.6.0',
          expect.objectContaining({ redactProxySecrets: true })
        );
      });

      it('passes redactProxySecrets:false to getFullAgentConfigMap when caller has fleet-settings-read', async () => {
        const fleetContext = (await context.fleet) as any;
        fleetContext.authz.fleet.readSettings = true;
        fleetContext.agentClient.asInternalUser.getLatestAgentAvailableDockerImageVersion.mockResolvedValue(
          '9.6.0'
        );
        agentPolicyServiceMock.getFullAgentConfigMap.mockResolvedValue('configmap-yaml');

        const request = httpServerMock.createKibanaRequest({
          params: { agentPolicyId: 'policy-1' },
          query: { kubernetes: true },
        });

        await getFullAgentPolicy(context, request, response);

        expect(agentPolicyServiceMock.getFullAgentConfigMap).toHaveBeenCalledWith(
          expect.anything(),
          'policy-1',
          '9.6.0',
          expect.objectContaining({ redactProxySecrets: false })
        );
      });
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
              },
              // policy-2 has no matching agents
              'policy-2': {
                doc_count: 0,
                unprivileged: { doc_count: 0 },
                fips: { doc_count: 0 },
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
        })
      );
      expect(agentPolicies[1]).toEqual(
        expect.objectContaining({
          agents: 0,
          unprivileged_agents: 0,
          fips_agents: 0,
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
        })
      );
    });
  });
});
