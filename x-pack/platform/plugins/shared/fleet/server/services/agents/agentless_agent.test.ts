/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { Logger } from '@kbn/core/server';

import { AgentlessAgentCreateFleetUnreachableError } from '../../../common/errors';
import {
  AgentlessAgentConfigError,
  AgentlessAgentCreateOverProvisionnedError,
  AgentlessAgentListNotFoundError,
} from '../../errors';
import type { AgentPolicy, NewAgentPolicy } from '../../types';
import {
  type AgentlessApiDeploymentResponse,
  AgentlessApiDeploymentResponseCode,
} from '../../../common/types';

import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';
import { listEnrollmentApiKeys } from '../api_keys';
import { fleetServerHostService } from '../fleet_server_host';

import { agentlessAgentService } from './agentless_agent';

jest.mock('../fleet_server_host');
jest.mock('../api_keys');
jest.mock('../output');
jest.mock('../download_source');
jest.mock('../agent_policy_update');
jest.mock('../package_policy');
jest.mock('../app_context');
jest.mock('../audit_logging');
jest.mock('../agent_policies/full_agent_policy');
jest.mock('../agent_policies/outputs_helpers');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

const mockedListEnrollmentApiKeys = listEnrollmentApiKeys as jest.Mock<
  ReturnType<typeof listEnrollmentApiKeys>
>;
const mockedFleetServerHostService = fleetServerHostService as jest.Mocked<
  typeof fleetServerHostService
>;

function getAgentPolicyCreateMock() {
  const soClient = savedObjectsClientMock.create();
  soClient.create.mockImplementation(async (type, attributes) => {
    return {
      attributes: attributes as unknown as NewAgentPolicy,
      id: 'mocked',
      type: 'mocked',
      references: [],
    };
  });
  return soClient;
}
let mockedLogger: jest.Mocked<Logger>;

const mockAgentlessDeploymentResponseData: AgentlessApiDeploymentResponse = {
  code: AgentlessApiDeploymentResponseCode.Success,
  error: null,
};

const mockAgentlessDeploymentResponse = {
  status: 200,
  data: mockAgentlessDeploymentResponseData,
};

const createMockFetchResponse = (data: unknown, status = 200): Response => {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers({ 'content-type': 'application/json' }),
  } as unknown as Response;
};

jest.mock('@kbn/server-http-tools', () => ({
  ...jest.requireActual('@kbn/server-http-tools'),
  SslConfig: jest.fn().mockImplementation(({ certificate, key, certificateAuthorities }) => ({
    certificate,
    key,
    certificateAuthorities: [certificateAuthorities],
  })),
}));

describe('Agentless Agent service', () => {
  let mockedFetch: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
    mockedAppContextService.getExperimentalFeatures.mockReturnValue({ agentless: false } as any);
    mockedFetch = jest.spyOn(global, 'fetch');
    jest.spyOn(agentPolicyService, 'getFullAgentPolicy').mockResolvedValue({
      outputs: { default: {} as any },
    } as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('should create agentless agent for ESS', async () => {
    mockedFetch.mockResolvedValueOnce(createMockFetchResponse(mockAgentlessDeploymentResponseData));
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
        deploymentSecrets: {
          fleetAppToken: 'fleet-app-token',
          elasticsearchAppToken: 'es-app-token',
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getKibanaVersion')
      .mockReturnValue('mocked-kibana-version-infinite');
    mockedFleetServerHostService.get.mockResolvedValue({
      id: 'mocked-fleet-server-id',
      host: 'http://fleetserver:8220',
      active: true,
      is_default: true,
      host_urls: ['http://fleetserver:8220'],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);

    const createAgentlessAgentReturnValue = await agentlessAgentService.createAgentlessAgent(
      esClient,
      soClient,
      {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
        data_output_id: 'mock-fleet-default-output',
        supports_agentless: true,
        global_data_tags: [
          {
            name: 'organization',
            value: 'elastic',
          },
          {
            name: 'division',
            value: 'cloud',
          },
          {
            name: 'team',
            value: 'fleet',
          },
        ],
      } as AgentPolicy
    );

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(createAgentlessAgentReturnValue).toEqual(mockAgentlessDeploymentResponse);
    expect(mockedFetch).toHaveBeenCalledWith(
      'http://api.agentless.com/api/v1/ess/deployments',
      expect.objectContaining({
        method: 'POST',
        headers: expect.anything(),
        body: expect.stringContaining('"policy_id":"mocked-agentless-agent-policy-id"'),
      })
    );
    const callBody = JSON.parse(mockedFetch.mock.calls[0][1].body);
    expect(callBody).toEqual(
      expect.objectContaining({
        fleet_token: 'mocked-fleet-enrollment-api-key',
        fleet_url: 'http://fleetserver:8220',
        policy_id: 'mocked-agentless-agent-policy-id',
        stack_version: 'mocked-kibana-version-infinite',
        labels: {
          owner: {
            org: 'elastic',
            division: 'cloud',
            team: 'fleet',
          },
        },
        secrets: {
          fleet_app_token: 'fleet-app-token',
          elasticsearch_app_token: 'es-app-token',
        },
        policy_details: {
          output_name: 'default',
        },
      })
    );
  });

  it('should create agentless agent for serverless', async () => {
    mockedFetch.mockResolvedValueOnce(createMockFetchResponse(mockAgentlessDeploymentResponseData));
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
        deploymentSecrets: {
          fleetAppToken: 'fleet-app-token',
          elasticsearchAppToken: 'es-app-token',
        },
      },
    } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isCloudEnabled: true, isServerlessEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getKibanaVersion')
      .mockReturnValue('mocked-kibana-version-infinite');
    mockedFleetServerHostService.get.mockResolvedValue({
      id: 'mocked-fleet-server-id',
      host: 'http://fleetserver:8220',
      active: true,
      is_default: true,
      host_urls: ['http://fleetserver:8220'],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);

    const createAgentlessAgentReturnValue = await agentlessAgentService.createAgentlessAgent(
      esClient,
      soClient,
      {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
        data_output_id: 'mock-fleet-default-output',
        supports_agentless: true,
        global_data_tags: [
          {
            name: 'organization',
            value: 'elastic',
          },
          {
            name: 'division',
            value: 'cloud',
          },
          {
            name: 'team',
            value: 'fleet',
          },
        ],
      } as AgentPolicy
    );

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(createAgentlessAgentReturnValue).toEqual(mockAgentlessDeploymentResponse);
    expect(mockedFetch).toHaveBeenCalledWith(
      'http://api.agentless.com/api/v1/serverless/deployments',
      expect.objectContaining({
        method: 'POST',
        headers: expect.anything(),
      })
    );
    const callBody = JSON.parse(mockedFetch.mock.calls[0][1].body);
    expect(callBody).toEqual(
      expect.objectContaining({
        fleet_token: 'mocked-fleet-enrollment-api-key',
        fleet_url: 'http://fleetserver:8220',
        policy_id: 'mocked-agentless-agent-policy-id',
        labels: {
          owner: {
            org: 'elastic',
            division: 'cloud',
            team: 'fleet',
          },
        },
        secrets: {
          fleet_app_token: 'fleet-app-token',
          elasticsearch_app_token: 'es-app-token',
        },
        policy_details: {
          output_name: 'default',
        },
      })
    );
  });

  it('should retry creating agentless agent on 500 error', async () => {
    mockedFetch.mockResolvedValueOnce(
      createMockFetchResponse({ message: 'Internal Server Error' }, 500)
    );
    mockedFetch.mockResolvedValueOnce(createMockFetchResponse(mockAgentlessDeploymentResponseData));
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
        deploymentSecrets: {
          fleetAppToken: 'fleet-app-token',
          elasticsearchAppToken: 'es-app-token',
        },
      },
    } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isCloudEnabled: true, isServerlessEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getKibanaVersion')
      .mockReturnValue('mocked-kibana-version-infinite');
    mockedFleetServerHostService.get.mockResolvedValue({
      id: 'mocked-fleet-server-id',
      host: 'http://fleetserver:8220',
      active: true,
      is_default: true,
      host_urls: ['http://fleetserver:8220'],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);

    const createAgentlessAgentReturnValue = await agentlessAgentService.createAgentlessAgent(
      esClient,
      soClient,
      {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
        data_output_id: 'mock-fleet-default-output',
        supports_agentless: true,
        global_data_tags: [
          {
            name: 'organization',
            value: 'elastic',
          },
          {
            name: 'division',
            value: 'cloud',
          },
          {
            name: 'team',
            value: 'fleet',
          },
        ],
      } as AgentPolicy
    );

    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(createAgentlessAgentReturnValue).toEqual(mockAgentlessDeploymentResponse);
    expect(mockedFetch).toHaveBeenCalledWith(
      'http://api.agentless.com/api/v1/serverless/deployments',
      expect.objectContaining({
        method: 'POST',
        headers: expect.anything(),
      })
    );
  });

  it('should create agentless agent with resources', async () => {
    mockedFetch.mockResolvedValueOnce(createMockFetchResponse(mockAgentlessDeploymentResponseData));
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
        deploymentSecrets: {
          fleetAppToken: 'fleet-app-token',
          elasticsearchAppToken: 'es-app-token',
        },
      },
    } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isCloudEnabled: true, isServerlessEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getKibanaVersion')
      .mockReturnValue('mocked-kibana-version-infinite');
    mockedFleetServerHostService.get.mockResolvedValue({
      id: 'mocked-fleet-server-id',
      host: 'http://fleetserver:8220',
      active: true,
      is_default: true,
      host_urls: ['http://fleetserver:8220'],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);

    const createAgentlessAgentReturnValue = await agentlessAgentService.createAgentlessAgent(
      esClient,
      soClient,
      {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
        data_output_id: 'mock-fleet-default-output',
        supports_agentless: true,
        agentless: {
          resources: {
            requests: {
              memory: '1Gi',
              cpu: '500m',
            },
          },
        },
        global_data_tags: [
          {
            name: 'organization',
            value: 'elastic',
          },
          {
            name: 'division',
            value: 'cloud',
          },
          {
            name: 'team',
            value: 'fleet',
          },
        ],
      } as AgentPolicy
    );

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(createAgentlessAgentReturnValue).toEqual(mockAgentlessDeploymentResponse);
    expect(mockedFetch).toHaveBeenCalledWith(
      'http://api.agentless.com/api/v1/serverless/deployments',
      expect.objectContaining({
        method: 'POST',
        headers: expect.anything(),
      })
    );
    const callBody = JSON.parse(mockedFetch.mock.calls[0][1].body);
    expect(callBody).toEqual(
      expect.objectContaining({
        fleet_token: 'mocked-fleet-enrollment-api-key',
        fleet_url: 'http://fleetserver:8220',
        policy_id: 'mocked-agentless-agent-policy-id',
        resources: {
          requests: {
            memory: '1Gi',
            cpu: '500m',
          },
        },
        labels: {
          owner: {
            org: 'elastic',
            division: 'cloud',
            team: 'fleet',
          },
        },
        secrets: {
          fleet_app_token: 'fleet-app-token',
          elasticsearch_app_token: 'es-app-token',
        },
        policy_details: {
          output_name: 'default',
        },
      })
    );
  });

  it('should create agentless agent with cloud_connectors', async () => {
    mockedFetch.mockResolvedValueOnce(createMockFetchResponse(mockAgentlessDeploymentResponseData));
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
        deploymentSecrets: {
          fleetAppToken: 'fleet-app-token',
          elasticsearchAppToken: 'es-app-token',
        },
      },
    } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isCloudEnabled: true, isServerlessEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getKibanaVersion')
      .mockReturnValue('mocked-kibana-version-infinite');
    mockedFleetServerHostService.get.mockResolvedValue({
      id: 'mocked-fleet-server-id',
      host: 'http://fleetserver:8220',
      active: true,
      is_default: true,
      host_urls: ['http://fleetserver:8220'],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);

    const createAgentlessAgentReturnValue = await agentlessAgentService.createAgentlessAgent(
      esClient,
      soClient,
      {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
        data_output_id: 'mock-fleet-default-output',
        supports_agentless: true,
        agentless: {
          resources: {
            requests: {
              memory: '1Gi',
              cpu: '500m',
            },
          },
          cloud_connectors: {
            target_csp: 'aws',
            enabled: true,
          },
        },
        global_data_tags: [
          {
            name: 'organization',
            value: 'elastic',
          },
          {
            name: 'division',
            value: 'cloud',
          },
          {
            name: 'team',
            value: 'fleet',
          },
        ],
      } as AgentPolicy
    );

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(createAgentlessAgentReturnValue).toEqual(mockAgentlessDeploymentResponse);
    expect(mockedFetch).toHaveBeenCalledWith(
      'http://api.agentless.com/api/v1/serverless/deployments',
      expect.objectContaining({
        method: 'POST',
        headers: expect.anything(),
      })
    );
    const callBody = JSON.parse(mockedFetch.mock.calls[0][1].body);
    expect(callBody).toEqual(
      expect.objectContaining({
        fleet_token: 'mocked-fleet-enrollment-api-key',
        fleet_url: 'http://fleetserver:8220',
        policy_id: 'mocked-agentless-agent-policy-id',
        resources: {
          requests: {
            memory: '1Gi',
            cpu: '500m',
          },
        },
        cloud_connectors: {
          target_csp: 'aws',
          enabled: true,
        },
        labels: {
          owner: {
            org: 'elastic',
            division: 'cloud',
            team: 'fleet',
          },
        },
        secrets: {
          fleet_app_token: 'fleet-app-token',
          elasticsearch_app_token: 'es-app-token',
        },
        policy_details: {
          output_name: 'default',
        },
      })
    );
  });

  it('should create agentless agent when no labels are given', async () => {
    mockedFetch.mockResolvedValueOnce(createMockFetchResponse(mockAgentlessDeploymentResponseData));
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
        deploymentSecrets: {
          fleetAppToken: 'fleet-app-token',
          elasticsearchAppToken: 'es-app-token',
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getKibanaVersion')
      .mockReturnValue('mocked-kibana-version-infinite');
    mockedFleetServerHostService.get.mockResolvedValue({
      id: 'mocked-fleet-server-id',
      host: 'http://fleetserver:8220',
      active: true,
      is_default: true,
      host_urls: ['http://fleetserver:8220'],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);

    const createAgentlessAgentReturnValue = await agentlessAgentService.createAgentlessAgent(
      esClient,
      soClient,
      {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
        data_output_id: 'mock-fleet-default-output',
        supports_agentless: true,
      } as AgentPolicy
    );

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(createAgentlessAgentReturnValue).toEqual(mockAgentlessDeploymentResponse);
    expect(mockedFetch).toHaveBeenCalledWith(
      'http://api.agentless.com/api/v1/ess/deployments',
      expect.objectContaining({
        method: 'POST',
        headers: expect.anything(),
      })
    );
    const callBody = JSON.parse(mockedFetch.mock.calls[0][1].body);
    expect(callBody).toEqual(
      expect.objectContaining({
        fleet_token: 'mocked-fleet-enrollment-api-key',
        fleet_url: 'http://fleetserver:8220',
        policy_id: 'mocked-agentless-agent-policy-id',
        stack_version: 'mocked-kibana-version-infinite',
      })
    );
  });

  it('should delete agentless agent for ESS', async () => {
    const returnValue = {
      status: 200,
      data: { id: 'mocked' },
    };

    mockedFetch.mockResolvedValueOnce(createMockFetchResponse({ id: 'mocked' }));
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
        deploymentSecrets: {
          fleetAppToken: 'fleet-app-token',
          elasticsearchAppToken: 'es-app-token',
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);

    const deleteAgentlessAgentReturnValue = await agentlessAgentService.deleteAgentlessAgent(
      'mocked-agentless-agent-policy-id'
    );

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(deleteAgentlessAgentReturnValue).toEqual(returnValue);
    expect(mockedFetch).toHaveBeenCalledWith(
      'http://api.agentless.com/api/v1/ess/deployments/mocked-agentless-agent-policy-id',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.anything(),
      })
    );
  });

  it('should upgraded agentless agent for ESS', async () => {
    mockedFetch.mockResolvedValueOnce(createMockFetchResponse(mockAgentlessDeploymentResponseData));
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
        deploymentSecrets: {
          fleetAppToken: 'fleet-app-token',
          elasticsearchAppToken: 'es-app-token',
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getKibanaVersion').mockReturnValue('8.18.0');
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);

    await agentlessAgentService.upgradeAgentlessDeployment('mocked-agentless-agent-policy-id');

    expect(mockedFetch).toHaveBeenCalledTimes(1);

    expect(mockedFetch).toHaveBeenCalledWith(
      'http://api.agentless.com/api/v1/ess/deployments/mocked-agentless-agent-policy-id',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.anything(),
      })
    );
    const callBody = JSON.parse(mockedFetch.mock.calls[0][1].body);
    expect(callBody).toEqual({
      stack_version: '8.18.0',
    });
  });

  it('should delete agentless agent for serverless', async () => {
    const returnValue = {
      status: 200,
      data: { id: 'mocked' },
    };

    mockedFetch.mockResolvedValueOnce(createMockFetchResponse({ id: 'mocked' }));
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
        deploymentSecrets: {
          fleetAppToken: 'fleet-app-token',
          elasticsearchAppToken: 'es-app-token',
        },
      },
    } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isCloudEnabled: true, isServerlessEnabled: true } as any);

    const deleteAgentlessAgentReturnValue = await agentlessAgentService.deleteAgentlessAgent(
      'mocked-agentless-agent-policy-id'
    );

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(deleteAgentlessAgentReturnValue).toEqual(returnValue);
    expect(mockedFetch).toHaveBeenCalledWith(
      'http://api.agentless.com/api/v1/serverless/deployments/mocked-agentless-agent-policy-id',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.anything(),
      })
    );
  });

  it('should redact sensitive information from debug logs', async () => {
    mockedFetch.mockResolvedValueOnce(createMockFetchResponse(mockAgentlessDeploymentResponseData));
    const soClient = getAgentPolicyCreateMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
        deploymentSecrets: {
          fleetAppToken: 'fleet-app-token',
          elasticsearchAppToken: 'es-app-token',
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getKibanaVersion')
      .mockReturnValue('mocked-kibana-version-infinite');

    mockedFleetServerHostService.get.mockResolvedValue({
      id: 'mocked-fleet-server-id',
      host: 'http://fleetserver:8220',
      active: true,
      is_default: true,
      host_urls: ['http://fleetserver:8220'],
    } as any);

    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);

    await agentlessAgentService.createAgentlessAgent(esClient, soClient, {
      id: 'mocked-agentless-agent-policy-id',
      name: 'agentless agent policy',
      namespace: 'default',
      fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
      data_output_id: 'mock-fleet-default-output',
      supports_agentless: true,
    } as AgentPolicy);

    // Assert that sensitive information is redacted
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('fleet_token: [REDACTED]')
    );
    expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('cert: [REDACTED]'));
    expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('key: [REDACTED]'));
    expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('ca: [REDACTED]'));
  });

  it('should log "undefined" on debug logs when tls configuration is missing', async () => {
    mockedFetch.mockResolvedValueOnce(createMockFetchResponse(mockAgentlessDeploymentResponseData));
    const soClient = getAgentPolicyCreateMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getKibanaVersion')
      .mockReturnValue('mocked-kibana-version-infinite');

    mockedFleetServerHostService.get.mockResolvedValue({
      id: 'mocked-fleet-server-id',
      host: 'http://fleetserver:8220',
      active: true,
      is_default: true,
      host_urls: ['http://fleetserver:8220'],
    } as any);

    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
        data_output_id: 'mock-fleet-default-output',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError();

    // Assert that tls configuration is missing
    expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('cert: undefined'));
    expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('key: undefined'));
    expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('ca: undefined'));
  });

  it('should redact sensitive information from error logs', async () => {
    const soClient = getAgentPolicyCreateMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
        deploymentSecrets: {
          fleetAppToken: 'fleet-app-token',
          elasticsearchAppToken: 'es-app-token',
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);

    mockedFleetServerHostService.get.mockResolvedValue({
      id: 'mocked-fleet-server-id',
      host: 'http://fleetserver:8220',
      active: true,
      is_default: true,
      host_urls: ['http://fleetserver:8220'],
    } as any);

    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);
    // Force fetch to throw an error to simulate an error response
    mockedFetch.mockRejectedValueOnce(new Error('Test Error'));

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
        data_output_id: 'mock-fleet-default-output',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError();

    // Assert that sensitive information is redacted
    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(`\"fleet_token\":\"[REDACTED]\"`),
      expect.any(Object)
    );
  });

  it(`should have x-elastic-internal-origin in the headers when the request is internal`, async () => {
    mockedFetch.mockResolvedValueOnce(createMockFetchResponse(mockAgentlessDeploymentResponseData));
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
        deploymentSecrets: {
          fleetAppToken: 'fleet-app-token',
          elasticsearchAppToken: 'es-app-token',
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getKibanaVersion')
      .mockReturnValue('mocked-kibana-version-infinite');
    mockedFleetServerHostService.get.mockResolvedValue({
      id: 'mocked-fleet-server-id',
      host: 'http://fleetserver:8220',
      active: true,
      is_default: true,
      host_urls: ['http://fleetserver:8220'],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);

    await agentlessAgentService.createAgentlessAgent(esClient, soClient, {
      id: 'mocked-agentless-agent-policy-id',
      name: 'agentless agent policy',
      namespace: 'default',
      fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
      data_output_id: 'mock-fleet-default-output',
      supports_agentless: true,
    } as AgentPolicy);

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-elastic-internal-origin': 'Kibana',
        }),
      })
    );
  });

  describe('error handling', () => {
    it('should throw AgentlessAgentConfigError if agentless policy does not support_agentless', async () => {
      const soClient = getAgentPolicyCreateMock();
      // ignore unrelated unique name constraint
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com/api/v1/ess',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: false,
        } as AgentPolicy)
      ).rejects.toThrowError(
        new AgentlessAgentConfigError(
          'Agentless agent policy does not have supports_agentless enabled'
        )
      );
    });

    it('should throw AgentlessAgentConfigError if cloud and serverless is not enabled', async () => {
      const soClient = getAgentPolicyCreateMock();
      // ignore unrelated unique name constraint
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest
        .spyOn(appContextService, 'getCloud')
        .mockReturnValue({ isCloudEnabled: false, isServerlessEnabled: false } as any);
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com/api/v1/ess',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError(
        new AgentlessAgentConfigError(
          'Agentless agents are only supported in cloud deployment and serverless projects'
        )
      );
    });

    it('should throw AgentlessAgentConfigError if agentless configuration is not found', async () => {
      const soClient = getAgentPolicyCreateMock();
      // ignore unrelated unique name constraint
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({} as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError(
        new AgentlessAgentConfigError('missing Agentless API configuration in Kibana')
      );
    });

    it('should throw AgentlessAgentConfigError if fleet hosts are not found', async () => {
      const soClient = getAgentPolicyCreateMock();
      // ignore unrelated unique name constraint
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com/api/v1/ess',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      mockedFleetServerHostService.get.mockRejectedValue(new Error('NOT FOUND'));
      mockedListEnrollmentApiKeys.mockResolvedValue({
        items: [
          {
            id: 'mocked',
            policy_id: 'mocked',
            api_key: 'mocked',
          },
        ],
      } as any);

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-invalid-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError(new AgentlessAgentConfigError('missing default Fleet server host'));
    });

    it('should throw AgentlessAgentConfigError if enrollment tokens are not found', async () => {
      const soClient = getAgentPolicyCreateMock();
      // ignore unrelated unique name constraint
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com/api/v1/ess',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      mockedFleetServerHostService.get.mockResolvedValue({
        id: 'mocked',
        host: 'http://fleetserver:8220',
        active: true,
        is_default: true,
      } as any);
      mockedListEnrollmentApiKeys.mockResolvedValue({
        items: [],
      } as any);

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError(new AgentlessAgentConfigError('missing Fleet enrollment token'));
    });

    it('should throw AgentlessAgentConfigError if agent policy is missing fleet_server_host_id', async () => {
      const soClient = getAgentPolicyCreateMock();
      // ignore unrelated unique name constraint
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com/api/v1/ess',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      mockedListEnrollmentApiKeys.mockResolvedValue({
        items: [
          {
            id: 'mocked',
            policy_id: 'mocked',
            api_key: 'mocked',
          },
        ],
      } as any);

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked',
          name: 'agentless agent policy',
          namespace: 'default',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError(new AgentlessAgentConfigError('missing fleet_server_host_id'));
    });

    it('should throw an error and log and error when the Agentless API returns a status not handled and not in the 2xx series', async () => {
      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
              ca: '/path/to/ca',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      mockedFleetServerHostService.get.mockResolvedValue({
        id: 'mocked-fleet-server-id',
        host: 'http://fleetserver:8220',
        active: true,
        is_default: true,
        host_urls: ['http://fleetserver:8220'],
      } as any);
      mockedListEnrollmentApiKeys.mockResolvedValue({
        items: [
          {
            id: 'mocked-fleet-enrollment-token-id',
            policy_id: 'mocked-policy-id',
            api_key: 'mocked-api-key',
          },
        ],
      } as any);
      // Mock fetch to return a non-ok response to simulate an error
      mockedFetch.mockResolvedValueOnce(
        createMockFetchResponse(
          {
            message: 'This is a fake error status that is never to be handled handled',
          },
          999
        )
      );

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked-agentless-agent-policy-id',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError();

      // Assert that the error is logged
      expect(mockedLogger.error).toHaveBeenCalledTimes(1);
    });

    it('should throw an error and log and error when the Agentless API returns status 500', async () => {
      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
              ca: '/path/to/ca',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      mockedFleetServerHostService.get.mockResolvedValue({
        id: 'mocked-fleet-server-id',
        host: 'http://fleetserver:8220',
        active: true,
        is_default: true,
        host_urls: ['http://fleetserver:8220'],
      } as any);
      mockedListEnrollmentApiKeys.mockResolvedValue({
        items: [
          {
            id: 'mocked-fleet-enrollment-token-id',
            policy_id: 'mocked-policy-id',
            api_key: 'mocked-api-key',
          },
        ],
      } as any);
      // Mock fetch to return non-ok responses to simulate errors
      const errorResponse = () =>
        createMockFetchResponse(
          {
            message: 'Internal Server Error',
          },
          500
        );

      mockedFetch.mockResolvedValueOnce(errorResponse());
      mockedFetch.mockResolvedValueOnce(errorResponse());
      mockedFetch.mockResolvedValueOnce(errorResponse());
      mockedFetch.mockResolvedValueOnce(errorResponse());
      mockedFetch.mockResolvedValueOnce(errorResponse());

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked-agentless-agent-policy-id',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError();

      // Assert that the error is logged
      expect(mockedLogger.error).toHaveBeenCalledTimes(1);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[Agentless API\] Creating the agentless agent failed with a status 500/
        ),
        {
          trace: expect.anything(),
          http: {
            request: {
              id: undefined,
            },
            response: {
              status_code: 500,
            },
          },
        }
      );
    });

    it('should throw an error and log and error when the Agentless API returns status 429', async () => {
      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
              ca: '/path/to/ca',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      mockedFleetServerHostService.get.mockResolvedValue({
        id: 'mocked-fleet-server-id',
        host: 'http://fleetserver:8220',
        active: true,
        is_default: true,
        host_urls: ['http://fleetserver:8220'],
      } as any);
      mockedListEnrollmentApiKeys.mockResolvedValue({
        items: [
          {
            id: 'mocked-fleet-enrollment-token-id',
            policy_id: 'mocked-policy-id',
            api_key: 'mocked-api-key',
          },
        ],
      } as any);
      // Mock fetch to return a non-ok response to simulate an error
      mockedFetch.mockResolvedValueOnce(
        createMockFetchResponse(
          {
            message: 'Limit exceeded',
          },
          429
        )
      );

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked-agentless-agent-policy-id',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError();

      // Assert that the error is logged
      expect(mockedLogger.error).toHaveBeenCalledTimes(1);
    });

    it('should throw an error and log and error when the Agentless API returns status 408', async () => {
      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
              ca: '/path/to/ca',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      mockedFleetServerHostService.get.mockResolvedValue({
        id: 'mocked-fleet-server-id',
        host: 'http://fleetserver:8220',
        active: true,
        is_default: true,
        host_urls: ['http://fleetserver:8220'],
      } as any);
      mockedListEnrollmentApiKeys.mockResolvedValue({
        items: [
          {
            id: 'mocked-fleet-enrollment-token-id',
            policy_id: 'mocked-policy-id',
            api_key: 'mocked-api-key',
          },
        ],
      } as any);
      // Mock fetch to return a non-ok response to simulate an error
      mockedFetch.mockResolvedValueOnce(
        createMockFetchResponse(
          {
            message: 'Request timed out',
          },
          408
        )
      );

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked-agentless-agent-policy-id',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError();

      // Assert that the error is logged
      expect(mockedLogger.error).toBeCalledTimes(1);
    });

    it('should throw an error and log and error when the Agentless API returns status 404', async () => {
      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
              ca: '/path/to/ca',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      mockedFleetServerHostService.get.mockResolvedValue({
        id: 'mocked-fleet-server-id',
        host: 'http://fleetserver:8220',
        active: true,
        is_default: true,
        host_urls: ['http://fleetserver:8220'],
      } as any);
      mockedListEnrollmentApiKeys.mockResolvedValue({
        items: [
          {
            id: 'mocked-fleet-enrollment-token-id',
            policy_id: 'mocked-policy-id',
            api_key: 'mocked-api-key',
          },
        ],
      } as any);
      // Mock fetch to return a non-ok response to simulate an error
      mockedFetch.mockResolvedValueOnce(
        createMockFetchResponse(
          {
            message: 'Not Found',
          },
          404
        )
      );

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked-agentless-agent-policy-id',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError();

      // Assert that the error is logged
      expect(mockedLogger.error).toBeCalledTimes(1);
    });

    it('should throw an error and log and error when the Agentless API returns status 403', async () => {
      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
              ca: '/path/to/ca',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      mockedFleetServerHostService.get.mockResolvedValue({
        id: 'mocked-fleet-server-id',
        host: 'http://fleetserver:8220',
        active: true,
        is_default: true,
        host_urls: ['http://fleetserver:8220'],
      } as any);
      mockedListEnrollmentApiKeys.mockResolvedValue({
        items: [
          {
            id: 'mocked-fleet-enrollment-token-id',
            policy_id: 'mocked-policy-id',
            api_key: 'mocked-api-key',
          },
        ],
      } as any);
      // Mock fetch to return a non-ok response to simulate an error
      mockedFetch.mockResolvedValueOnce(
        createMockFetchResponse(
          {
            message: 'Forbidden',
          },
          403
        )
      );

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked-agentless-agent-policy-id',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError();

      // Assert that the error is logged
      expect(mockedLogger.error).toBeCalledTimes(1);
    });

    it('should throw an error and log and error when the Agentless API returns status 401', async () => {
      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
              ca: '/path/to/ca',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      mockedFleetServerHostService.get.mockResolvedValue({
        id: 'mocked-fleet-server-id',
        host: 'http://fleetserver:8220',
        active: true,
        is_default: true,
        host_urls: ['http://fleetserver:8220'],
      } as any);
      mockedListEnrollmentApiKeys.mockResolvedValue({
        items: [
          {
            id: 'mocked-fleet-enrollment-token-id',
            policy_id: 'mocked-policy-id',
            api_key: 'mocked-api-key',
          },
        ],
      } as any);
      // Mock fetch to return a non-ok response to simulate an error
      mockedFetch.mockResolvedValueOnce(
        createMockFetchResponse(
          {
            message: 'Unauthorized',
          },
          401
        )
      );

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked-agentless-agent-policy-id',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError();

      // Assert that the error is logged
      expect(mockedLogger.error).toBeCalledTimes(1);
    });

    it('should throw an error and log and error when the Agentless API returns status 400', async () => {
      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
              ca: '/path/to/ca',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      mockedFleetServerHostService.get.mockResolvedValue({
        id: 'mocked-fleet-server-id',
        host: 'http://fleetserver:8220',
        active: true,
        is_default: true,
        host_urls: ['http://fleetserver:8220'],
      } as any);
      mockedListEnrollmentApiKeys.mockResolvedValue({
        items: [
          {
            id: 'mocked-fleet-enrollment-token-id',
            policy_id: 'mocked-policy-id',
            api_key: 'mocked-api-key',
          },
        ],
      } as any);
      // Mock fetch to return a non-ok response to simulate an error
      mockedFetch.mockResolvedValueOnce(
        createMockFetchResponse(
          {
            message: 'Bad Request',
          },
          400
        )
      );

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked-agentless-agent-policy-id',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError();

      // Assert that the error is logged
      expect(mockedLogger.error).toBeCalledTimes(1);
    });

    it('should throw an error and log and error when the Agentless API returns status 400 with code FLEET_UNREACHABLE', async () => {
      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
              ca: '/path/to/ca',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      mockedFleetServerHostService.get.mockResolvedValue({
        id: 'mocked-fleet-server-id',
        host: 'http://fleetserver:8220',
        active: true,
        is_default: true,
        host_urls: ['http://fleetserver:8220'],
      } as any);
      mockedListEnrollmentApiKeys.mockResolvedValue({
        items: [
          {
            id: 'mocked-fleet-enrollment-token-id',
            policy_id: 'mocked-policy-id',
            api_key: 'mocked-api-key',
          },
        ],
      } as any);

      // Mock fetch to return a non-ok response to simulate an error
      mockedFetch.mockResolvedValueOnce(
        createMockFetchResponse(
          {
            code: 'FLEET_UNREACHABLE',
            message: 'Bad Request',
          },
          400
        )
      );

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked-agentless-agent-policy-id',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError(AgentlessAgentCreateFleetUnreachableError);

      // Assert that the error is logged
      expect(mockedLogger.error).toBeCalledTimes(1);
    });

    it('should throw an error and log and error when the Agentless API returns status 429 with code OVER_PROVISIONED', async () => {
      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
              ca: '/path/to/ca',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      mockedFleetServerHostService.get.mockResolvedValue({
        id: 'mocked-fleet-server-id',
        host: 'http://fleetserver:8220',
        active: true,
        is_default: true,
        host_urls: ['http://fleetserver:8220'],
      } as any);
      mockedListEnrollmentApiKeys.mockResolvedValue({
        items: [
          {
            id: 'mocked-fleet-enrollment-token-id',
            policy_id: 'mocked-policy-id',
            api_key: 'mocked-api-key',
          },
        ],
      } as any);

      // Mock fetch to return a non-ok response to simulate an error
      mockedFetch.mockResolvedValueOnce(
        createMockFetchResponse(
          {
            code: 'OVER_PROVISIONED',
            error: 'reached limit: 5',
            message: 'reached limit: 5',
          },
          429
        )
      );

      await expect(
        agentlessAgentService.createAgentlessAgent(esClient, soClient, {
          id: 'mocked-agentless-agent-policy-id',
          name: 'agentless agent policy',
          namespace: 'default',
          fleet_server_host_id: 'mock-fleet-default-fleet-server-host',
          data_output_id: 'mock-fleet-default-output',
          supports_agentless: true,
        } as AgentPolicy)
      ).rejects.toThrowError(AgentlessAgentCreateOverProvisionnedError);

      // Assert that the error is logged
      expect(mockedLogger.error).toBeCalledTimes(1);
    });

    it('Agentless list API should handle 404', async () => {
      jest.spyOn(appContextService, 'getConfig').mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'http://api.agentless.com',
            tls: {
              certificate: '/path/to/cert',
              key: '/path/to/key',
              ca: '/path/to/ca',
            },
          },
          deploymentSecrets: {
            fleetAppToken: 'fleet-app-token',
            elasticsearchAppToken: 'es-app-token',
          },
        },
      } as any);
      jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
      mockedFleetServerHostService.get.mockResolvedValue({
        id: 'mocked-fleet-server-id',
        host: 'http://fleetserver:8220',
        active: true,
        is_default: true,
        host_urls: ['http://fleetserver:8220'],
      } as any);
      mockedListEnrollmentApiKeys.mockResolvedValue({
        items: [
          {
            id: 'mocked-fleet-enrollment-token-id',
            policy_id: 'mocked-policy-id',
            api_key: 'mocked-api-key',
          },
        ],
      } as any);

      // Mock fetch to return a non-ok response to simulate an error
      mockedFetch.mockResolvedValueOnce(createMockFetchResponse({}, 404));

      await expect(agentlessAgentService.listAgentlessDeployments()).rejects.toThrowError(
        AgentlessAgentListNotFoundError
      );

      // Assert that the error is logged
      expect(mockedLogger.error).toBeCalledTimes(1);
    });
  });
});
