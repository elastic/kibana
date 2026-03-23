/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { agentPolicyService } from '../../services';
import { getFleetServerPolicies } from '../../services/fleet_server';

import type { FleetRequestHandlerContext } from '../../types';
import { GetEnrollmentSettingsResponseSchema } from '../../types';
import { xpackMocks } from '../../mocks';

import {
  getFleetServerOrAgentPolicies,
  getDownloadSource,
  getEnrollmentSettingsHandler,
} from './enrollment_settings_handler';

jest.mock('../../services', () => ({
  agentPolicyService: {
    get: jest.fn(),
    getByIds: jest.fn(),
  },
  appContextService: {
    getInternalUserSOClientWithoutSpaceExtension: jest.fn(),
  },
  downloadSourceService: {
    list: jest.fn().mockResolvedValue({
      items: [
        {
          id: 'source-1',
          name: 'Source 1',
          host: 'https://source-1/',
          is_default: true,
          auth: {
            username: 'elastic',
            password: 'source-password',
            api_key: 'source-api-key',
          },
          ssl: {
            certificate_authorities: ['/path/to/source-ca'],
            certificate: '/path/to/source-cert',
            key: '/path/to/source-key',
          },
          secrets: {
            ssl: {
              key: { id: 'source-ssl-key-secret' },
            },
          },
        },
        {
          id: 'source-2',
          name: 'Source 2',
          host: 'https://source-2/',
          is_default: false,
          proxy_id: 'proxy-1',
        },
      ],
    }),
  },
}));

jest.mock('../../services/fleet_server', () => ({
  getFleetServerPolicies: jest.fn(),
  hasFleetServersForPolicies: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../services/fleet_server_host', () => ({
  getFleetServerHostsForAgentPolicy: jest.fn().mockResolvedValue({
    id: 'host-1',
    is_default: true,
    is_preconfigured: true,
    name: 'Host 1',
    host_urls: ['http://localhost:8220'],
    proxy_id: 'proxy-1',
    ssl: {
      certificate: '/path/to/cert',
      certificate_authorities: ['/path/to/ca'],
      key: '/path/to/key',
      es_certificate: '/path/to/es-cert',
      es_key: '/path/to/es-key',
      agent_certificate: '/path/to/agent-cert',
      agent_key: '/path/to/agent-key',
    },
    secrets: {
      ssl: {
        key: { id: 'host-key-secret' },
        es_key: { id: 'host-es-key-secret' },
        agent_key: { id: 'host-agent-key-secret' },
      },
    },
  }),
}));

jest.mock('../../services/fleet_proxies', () => ({
  getFleetProxy: jest.fn().mockResolvedValue({
    id: 'proxy-1',
    name: 'Proxy 1',
    url: 'https://proxy-1/',
    is_preconfigured: true,
    proxy_headers: {
      authorization: 'Bearer secret-token',
    },
    certificate: 'proxy-cert',
    certificate_authorities: 'proxy-ca',
    certificate_key: 'proxy-key',
  }),
}));

jest.mock('../../services/agent_policies', () => ({
  getDataOutputForAgentPolicy: jest.fn().mockResolvedValue({
    id: 'output-1',
    name: 'Default output',
    type: 'elasticsearch',
    is_default: true,
    is_default_monitoring: true,
    hosts: ['https://elasticsearch:9200'],
    proxy_id: 'proxy-1',
    ssl: {
      certificate: '/path/to/output-cert',
      key: '/path/to/output-key',
      certificate_authorities: ['/path/to/output-ca'],
    },
    secrets: {
      ssl: {
        key: { id: 'output-ssl-key-secret' },
      },
    },
  }),
}));

describe('EnrollmentSettingsHandler utils', () => {
  const mockSoClient = savedObjectsClientMock.create();
  const mockAgentPolicies = [
    {
      id: 'agent-policy-1',
      name: 'Agent Policy 1',
      is_managed: false,
      is_default_fleet_server: false,
      has_fleet_server: false,
      download_source_id: undefined,
      fleet_server_host_id: undefined,
    },
    {
      id: 'agent-policy-2',
      name: 'Agent Policy 2',
      is_managed: false,
      is_default_fleet_server: false,
      has_fleet_server: false,
      download_source_id: undefined,
      fleet_server_host_id: undefined,
    },
  ];
  const mockPackagePolicies = [
    {
      id: 'package-policy-1',
      name: 'Package Policy 1',
      package: {
        name: 'fleet_server',
        title: 'Fleet Server',
        version: '1.0.0',
      },
      policy_id: 'fs-policy-1',
    },
    {
      id: 'package-policy-2',
      name: 'Package Policy 2',
      package: {
        name: 'fleet_server',
        title: 'Fleet Server',
        version: '1.0.0',
      },
      policy_id: 'fs-policy-2',
    },
    {
      id: 'package-policy-3',
      name: 'Package Policy 3',
      package: {
        name: 'system',
        title: 'System',
        version: '1.0.0',
      },
      policy_id: 'agent-policy-2',
    },
  ];
  const mockFleetServerPolicies = [
    {
      id: 'fs-policy-1',
      name: 'FS Policy 1',
      is_managed: true,
      is_default_fleet_server: true,
      has_fleet_server: true,
      download_source_id: undefined,
      fleet_server_host_id: undefined,
    },
    {
      id: 'fs-policy-2',
      name: 'FS Policy 2',
      is_managed: true,
      is_default_fleet_server: false,
      has_fleet_server: false,
      download_source_id: undefined,
      fleet_server_host_id: undefined,
    },
  ];

  describe('getFleetServerOrAgentPolicies', () => {
    it('returns only fleet server policies if there are any when no agent policy ID is provided', async () => {
      (getFleetServerPolicies as jest.Mock).mockResolvedValueOnce(mockFleetServerPolicies);
      const { fleetServerPolicies, scopedAgentPolicy } = await getFleetServerOrAgentPolicies(
        mockSoClient
      );
      expect(fleetServerPolicies).toEqual(mockFleetServerPolicies);
      expect(scopedAgentPolicy).toBeUndefined();
    });

    it('returns no fleet server policies when there are none and no agent policy ID is provided', async () => {
      (getFleetServerPolicies as jest.Mock).mockResolvedValueOnce([]);
      const { fleetServerPolicies, scopedAgentPolicy } = await getFleetServerOrAgentPolicies(
        mockSoClient
      );
      expect(fleetServerPolicies).toEqual([]);
      expect(scopedAgentPolicy).toBeUndefined();
    });

    it('returns fleet server policy when specified agent policy ID is a fleet server policy', async () => {
      (agentPolicyService.get as jest.Mock).mockResolvedValueOnce({
        ...mockFleetServerPolicies[1],
        package_policies: [mockPackagePolicies[1]],
      });
      const { fleetServerPolicies, scopedAgentPolicy } = await getFleetServerOrAgentPolicies(
        mockSoClient,
        'fs-policy-2'
      );
      expect(fleetServerPolicies).toEqual([mockFleetServerPolicies[1]]);
      expect(scopedAgentPolicy).toEqual(mockFleetServerPolicies[1]);
    });

    it('returns scoped agent policy when specified agent policy ID is not a fleet server policy', async () => {
      (agentPolicyService.get as jest.Mock).mockResolvedValueOnce({
        ...mockAgentPolicies[1],
        package_policies: [mockPackagePolicies[2]],
      });
      const { fleetServerPolicies, scopedAgentPolicy } = await getFleetServerOrAgentPolicies(
        mockSoClient,
        'agent-policy-2'
      );
      expect(fleetServerPolicies).toBeUndefined();
      expect(scopedAgentPolicy).toEqual(mockAgentPolicies[1]);
    });

    it('returns no policies when specified agent policy ID is not found', async () => {
      (agentPolicyService.get as jest.Mock).mockResolvedValueOnce(undefined);
      const { fleetServerPolicies, scopedAgentPolicy } = await getFleetServerOrAgentPolicies(
        mockSoClient,
        'agent-policy-3'
      );
      expect(fleetServerPolicies).toBeUndefined();
      expect(scopedAgentPolicy).toBeUndefined();
    });
  });

  describe('getDownloadSource', () => {
    it('returns the default download source when no id is specified', async () => {
      const source = await getDownloadSource();
      expect(source).toMatchObject({
        id: 'source-1',
        name: 'Source 1',
        host: 'https://source-1/',
        is_default: true,
      });
    });

    it('returns the default download source when the specified id is not found', async () => {
      const source = await getDownloadSource('some-id');
      expect(source).toMatchObject({
        id: 'source-1',
        name: 'Source 1',
        host: 'https://source-1/',
        is_default: true,
      });
    });

    it('returns the correct download source when an id is specified', async () => {
      const source = await getDownloadSource('source-2');
      expect(source).toEqual({
        id: 'source-2',
        name: 'Source 2',
        host: 'https://source-2/',
        is_default: false,
        proxy_id: 'proxy-1',
      });
    });

    describe('schema validation', () => {
      let context: FleetRequestHandlerContext;
      let response: ReturnType<typeof httpServerMock.createResponseFactory>;

      beforeEach(() => {
        context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
        response = httpServerMock.createResponseFactory();
      });

      it('should return valid enrollment settings', async () => {
        const fleetServerPolicies = [
          {
            id: 'fs-policy-1',
            name: 'FS Policy 1',
            is_managed: true,
            is_default_fleet_server: true,
            has_fleet_server: true,
            download_source_id: 'source-2',
            fleet_server_host_id: undefined,
          },
        ];
        (getFleetServerPolicies as jest.Mock).mockResolvedValueOnce(fleetServerPolicies);
        const expectedResponse = {
          fleet_server: {
            has_active: true,
            host_proxy: {
              id: 'proxy-1',
              name: 'Proxy 1',
              url: 'https://proxy-1/',
            },

            host: {
              host_urls: ['http://localhost:8220'],
              id: 'host-1',
              is_default: true,
              is_preconfigured: true,
              name: 'Host 1',
              proxy_id: 'proxy-1',
              ssl: {
                certificate: '/path/to/cert',
                certificate_authorities: ['/path/to/ca'],
                es_certificate: '/path/to/es-cert',
                agent_certificate: '/path/to/agent-cert',
              },
            },
            es_output: {
              id: 'output-1',
              name: 'Default output',
              type: 'elasticsearch',
              is_default: true,
              is_default_monitoring: true,
              hosts: ['https://elasticsearch:9200'],
              proxy_id: 'proxy-1',
              ssl: {
                certificate: '/path/to/output-cert',
                certificate_authorities: ['/path/to/output-ca'],
              },
            },
            es_output_proxy: {
              id: 'proxy-1',
              name: 'Proxy 1',
              url: 'https://proxy-1/',
            },
            policies: [
              {
                download_source_id: 'source-2',
                fleet_server_host_id: undefined,
                has_fleet_server: true,
                id: 'fs-policy-1',
                is_default_fleet_server: true,
                is_managed: true,
                name: 'FS Policy 1',
                space_ids: undefined,
                data_output_id: undefined,
              },
            ],
          },
          download_source: {
            host: 'https://source-1/',
            id: 'source-1',
            is_default: true,
            name: 'Source 1',
            auth: {
              username: 'elastic',
            },
            ssl: {
              certificate_authorities: ['/path/to/source-ca'],
              certificate: '/path/to/source-cert',
            },
          },
        };
        await getEnrollmentSettingsHandler(context, {} as any, response);
        expect(response.ok).toHaveBeenCalledWith({
          body: expectedResponse,
        });

        const actualBody = (response.ok as jest.Mock).mock.calls[0][0].body;
        expect(actualBody.download_source?.auth?.password).toBeUndefined();
        expect(actualBody.download_source?.auth?.api_key).toBeUndefined();
        expect(actualBody.download_source?.ssl?.key).toBeUndefined();
        expect(actualBody.download_source?.secrets).toBeUndefined();
        expect(actualBody.download_source_proxy?.proxy_headers).toBeUndefined();
        expect(actualBody.download_source_proxy?.certificate).toBeUndefined();
        expect(actualBody.download_source_proxy?.certificate_authorities).toBeUndefined();
        expect(actualBody.download_source_proxy?.certificate_key).toBeUndefined();
        expect(actualBody.fleet_server.host?.ssl?.key).toBeUndefined();
        expect(actualBody.fleet_server.host?.ssl?.es_key).toBeUndefined();
        expect(actualBody.fleet_server.host?.ssl?.agent_key).toBeUndefined();
        expect(actualBody.fleet_server.host?.secrets).toBeUndefined();
        expect(actualBody.fleet_server.es_output?.ssl?.key).toBeUndefined();
        expect(actualBody.fleet_server.es_output?.secrets).toBeUndefined();
        expect(actualBody.fleet_server.host_proxy?.proxy_headers).toBeUndefined();
        expect(actualBody.fleet_server.es_output_proxy?.certificate_key).toBeUndefined();

        const validationResp = GetEnrollmentSettingsResponseSchema.validate(expectedResponse);
        expect(validationResp).toEqual(expectedResponse);
      });
    });
  });
});
