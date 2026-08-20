/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import { agentPolicyService, appContextService } from '../../services';
import { listFleetProxies } from '../../services/fleet_proxies';

import type { FleetRequestHandlerContext } from '../..';
import { createAppContextStartContractMock, xpackMocks } from '../../mocks';
import type { AgentClient } from '../../services/agents';
import type { AgentPolicy } from '../../types';
import { createAgentPolicyWithPackages } from '../../services/agent_policy_create';

import {
  bulkGetAgentPoliciesHandler,
  copyAgentPolicyHandler,
  createAgentPolicyHandler,
  downloadFullAgentPolicy,
  getFullAgentPolicy,
  GetListAgentPolicyOutputsHandler,
  populateAssignedAgentsCount,
} from './handlers';

jest.mock('../../services/agent_policy', () => {
  return {
    agentPolicyService: {
      get: jest.fn(),
      getByIds: jest.fn(),
      copy: jest.fn(),
      listAllOutputsForPolicies: jest.fn(),
      getFullAgentPolicy: jest.fn(),
      getFleetServerPolicy: jest.fn(),
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

  describe('createAgentPolicyHandler', () => {
    const createdAgentPolicy = { id: 'new-policy', name: 'New policy' } as AgentPolicy;

    beforeEach(() => {
      (createAgentPolicyWithPackages as jest.Mock).mockResolvedValue(createdAgentPolicy);
    });

    afterEach(() => {
      appContextService.stop();
    });

    it('should reject agentless agent policies when disableAgentlessLegacyAPI is enabled', async () => {
      appContextService.start(
        createAppContextStartContractMock({}, false, undefined, {
          disableAgentlessLegacyAPI: true,
        })
      );
      const request = httpServerMock.createKibanaRequest({
        body: { name: 'Agentless policy', namespace: 'default', supports_agentless: true },
      });

      await expect(createAgentPolicyHandler(context, request, response)).rejects.toThrow(
        /To create managed integrations/
      );
      expect(createAgentPolicyWithPackages).not.toHaveBeenCalled();
    });

    it('should allow agentless agent policies when disableAgentlessLegacyAPI is disabled', async () => {
      appContextService.start(createAppContextStartContractMock());
      const request = httpServerMock.createKibanaRequest({
        body: { name: 'Agentless policy', namespace: 'default', supports_agentless: true },
      });

      await createAgentPolicyHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: { item: createdAgentPolicy },
      });
      // Flag off: the legacy agentless write is allowed but logged so it stays
      // measurable before the flag is flipped fleet-wide.
      expect(appContextService.getLogger().warn).toHaveBeenCalledWith(
        expect.stringContaining('legacy_agentless_write_deprecation')
      );
    });

    it('should not log the legacy agentless deprecation for non-agentless agent policies when the flag is disabled', async () => {
      appContextService.start(createAppContextStartContractMock());
      const request = httpServerMock.createKibanaRequest({
        body: { name: 'Regular policy', namespace: 'default' },
      });

      await createAgentPolicyHandler(context, request, response);

      expect(response.ok).toHaveBeenCalled();
      expect(appContextService.getLogger().warn).not.toHaveBeenCalledWith(
        expect.stringContaining('legacy_agentless_write_deprecation')
      );
    });
  });

  describe('copyAgentPolicyHandler', () => {
    const copiedAgentPolicy = { id: 'copied-policy', name: 'Copied policy' } as AgentPolicy;

    beforeEach(() => {
      jest.clearAllMocks();
      agentPolicyServiceMock.copy.mockResolvedValue(copiedAgentPolicy);
    });

    afterEach(() => {
      appContextService.stop();
    });

    const getCopyRequest = () =>
      httpServerMock.createKibanaRequest({
        params: { agentPolicyId: 'source-policy' },
        body: { name: 'Copied policy', description: '' },
      });

    it('should reject copying agentless agent policies when disableAgentlessLegacyAPI is enabled', async () => {
      appContextService.start(
        createAppContextStartContractMock({}, false, undefined, {
          disableAgentlessLegacyAPI: true,
        })
      );
      agentPolicyServiceMock.get.mockResolvedValue({
        id: 'source-policy',
        supports_agentless: true,
      } as AgentPolicy);

      await expect(copyAgentPolicyHandler(context, getCopyRequest(), response)).rejects.toThrow(
        /Managed integrations cannot be copied.*Offending ID: source-policy\./
      );
      expect(agentPolicyServiceMock.copy).not.toHaveBeenCalled();
    });

    it('should allow copying regular agent policies when disableAgentlessLegacyAPI is enabled', async () => {
      appContextService.start(
        createAppContextStartContractMock({}, false, undefined, {
          disableAgentlessLegacyAPI: true,
        })
      );
      agentPolicyServiceMock.get.mockResolvedValue({ id: 'source-policy' } as AgentPolicy);

      await copyAgentPolicyHandler(context, getCopyRequest(), response);

      expect(response.ok).toHaveBeenCalledWith({
        body: { item: copiedAgentPolicy },
      });
    });

    it('should allow copying agentless agent policies when disableAgentlessLegacyAPI is disabled', async () => {
      appContextService.start(createAppContextStartContractMock());

      await copyAgentPolicyHandler(context, getCopyRequest(), response);

      expect(response.ok).toHaveBeenCalledWith({
        body: { item: copiedAgentPolicy },
      });
      expect(agentPolicyServiceMock.get).not.toHaveBeenCalled();
    });
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

    describe('main composition path (no revision / no kubernetes)', () => {
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

    describe('?revision=N branch', () => {
      // Deep-clone per test because redactProxySecretsFromPolicy mutates in place
      const makeStoredDoc = () => ({ data: JSON.parse(JSON.stringify(POLICY_WITH_SECRETS)) });

      it('strips proxy secrets from the response when caller lacks fleet-settings-read', async () => {
        const fleetContext = (await context.fleet) as any;
        fleetContext.authz.fleet.readSettings = false;
        agentPolicyServiceMock.getFleetServerPolicy.mockResolvedValue(makeStoredDoc() as any);

        const request = httpServerMock.createKibanaRequest({
          params: { agentPolicyId: 'policy-1' },
          query: { revision: 2 },
        });

        await getFullAgentPolicy(context, request, response);

        expect(response.ok).toHaveBeenCalled();
        const body = (response.ok as jest.Mock).mock.calls[0][0].body;
        // proxy-derived fields are redacted on the proxied output
        expect(body.item.outputs.default).not.toHaveProperty('proxy_headers');
        expect(body.item.outputs.default.ssl).not.toHaveProperty('key');
        expect(body.item.outputs.default.ssl?.certificate).toBe('my-cert');
        expect(body.item.outputs.default.proxy_url).toBe('https://proxy.fr');
        // fleet proxy_headers are redacted; ssl.key preserved (proxy has no certificate_key in this test)
        expect(body.item.fleet).not.toHaveProperty('proxy_headers');
        expect(body.item.fleet.ssl?.key).toBe('PRIVATE_KEY');
        // agent.download proxy_headers are redacted; ssl.key preserved (no proxy certificate_key)
        expect(body.item.agent.download).not.toHaveProperty('proxy_headers');
        expect(body.item.agent.download.ssl?.key).toBe('PRIVATE_KEY');
      });

      it('strips fleet and download ssl.key when the proxy has a certificate_key', async () => {
        const fleetContext = (await context.fleet) as any;
        fleetContext.authz.fleet.readSettings = false;
        agentPolicyServiceMock.getFleetServerPolicy.mockResolvedValue(makeStoredDoc() as any);
        (listFleetProxies as jest.Mock).mockResolvedValueOnce({
          items: [{ url: 'https://proxy.fr', certificate_key: 'PROXY_CERT_KEY' }],
        });

        const request = httpServerMock.createKibanaRequest({
          params: { agentPolicyId: 'policy-1' },
          query: { revision: 2 },
        });

        await getFullAgentPolicy(context, request, response);

        expect(response.ok).toHaveBeenCalled();
        const body = (response.ok as jest.Mock).mock.calls[0][0].body;
        // fleet ssl.key is proxy-derived — must be redacted when proxy has certificate_key
        expect(body.item.fleet).not.toHaveProperty('proxy_headers');
        expect(body.item.fleet.ssl).not.toHaveProperty('key');
        // agent.download has no proxy_url so its ssl.key cannot be matched — left intact
        expect(body.item.agent.download).not.toHaveProperty('proxy_headers');
        expect(body.item.agent.download.ssl?.key).toBe('PRIVATE_KEY');
      });

      it('returns full secrets in the response when caller has fleet-settings-read', async () => {
        const fleetContext = (await context.fleet) as any;
        fleetContext.authz.fleet.readSettings = true;
        agentPolicyServiceMock.getFleetServerPolicy.mockResolvedValue(makeStoredDoc() as any);

        const request = httpServerMock.createKibanaRequest({
          params: { agentPolicyId: 'policy-1' },
          query: { revision: 2 },
        });

        await getFullAgentPolicy(context, request, response);

        expect(response.ok).toHaveBeenCalled();
        const body = (response.ok as jest.Mock).mock.calls[0][0].body;
        expect(body.item.outputs.default.proxy_headers).toEqual({ Authorization: 'Bearer SECRET' });
        expect(body.item.outputs.default.ssl?.key).toBe('PRIVATE_KEY');
      });

      it('strips proxy secrets from the download YAML when caller lacks fleet-settings-read', async () => {
        const fleetContext = (await context.fleet) as any;
        fleetContext.authz.fleet.readSettings = false;
        agentPolicyServiceMock.getFleetServerPolicy.mockResolvedValue(makeStoredDoc() as any);

        const request = httpServerMock.createKibanaRequest({
          params: { agentPolicyId: 'policy-1' },
          query: { revision: 2 },
        });

        await downloadFullAgentPolicy(context, request, response);

        expect(response.ok).toHaveBeenCalled();
        const yaml: string = (response.ok as jest.Mock).mock.calls[0][0].body;
        // proxy_headers (bearer tokens) must be gone
        expect(yaml).not.toContain('Bearer SECRET');
        // proxy_url (non-secret) must remain
        expect(yaml).toContain('https://proxy.fr');
        // proxy has no certificate_key in this test — fleet/download ssl.key must remain
        expect(yaml).toContain('PRIVATE_KEY');
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
