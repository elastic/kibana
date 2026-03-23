/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../security');
jest.mock('./crud');
jest.mock('./status');
jest.mock('./versions');
jest.mock('../app_context', () => ({
  appContextService: {
    getInternalUserSOClientForSpaceId: jest.fn(),
    getSavedObjects: jest.fn(),
  },
}));

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import { FleetUnauthorizedError } from '../../errors';

import { getAuthzFromRequest } from '../security';
import type { FleetAuthz } from '../../../common';
import { createFleetAuthzMock } from '../../../common/mocks';
import { appContextService } from '../app_context';

import type { AgentClient } from './agent_service';
import { AgentServiceImpl } from './agent_service';
import { getAgentsByKuery, getAgentById } from './crud';
import { getAgentStatusById, getAgentStatusForAgentPolicy } from './status';
import { getLatestAvailableAgentVersion } from './versions';

const mockGetAuthzFromRequest = getAuthzFromRequest as jest.Mock<Promise<FleetAuthz>>;
const mockGetAgentsByKuery = getAgentsByKuery as jest.Mock;
const mockGetAgentById = getAgentById as jest.Mock;
const mockGetAgentStatusById = getAgentStatusById as jest.Mock;
const mockGetAgentStatusForAgentPolicy = getAgentStatusForAgentPolicy as jest.Mock;
const mockgetLatestAvailableAgentVersion = getLatestAvailableAgentVersion as jest.Mock;

describe('AgentService', () => {
  let mockedScopedSoClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    jest.resetAllMocks();
    mockedScopedSoClient = savedObjectsClientMock.create();
    jest.mocked(appContextService.getSavedObjects).mockReturnValue({
      getScopedClient: jest.fn().mockReturnValue(mockedScopedSoClient),
    } as any);
    jest
      .mocked(appContextService.getInternalUserSOClientForSpaceId)
      .mockReturnValue(mockedScopedSoClient);
  });

  describe('asScoped', () => {
    describe('without required privilege', () => {
      let agentClient: AgentClient;

      beforeEach(() => {
        mockGetAuthzFromRequest.mockReturnValue(
          Promise.resolve({
            fleet: {
              all: false,
              setup: false,
              readAgents: false,
              readEnrollmentTokens: false,
              readAgentPolicies: false,
              allAgentPolicies: false,
              allAgents: false,
              allSettings: false,
              readSettings: false,
              addAgents: false,
              addFleetServers: false,
              generateAgentReports: false,
            },
            integrations: {
              all: true,
              readPackageInfo: false,
              readInstalledPackages: false,
              installPackages: false,
              upgradePackages: false,
              uploadPackages: false,
              removePackages: false,
              readPackageSettings: false,
              writePackageSettings: false,
              readIntegrationPolicies: false,
              writeIntegrationPolicies: false,
            },
          })
        );
        agentClient = new AgentServiceImpl(
          elasticsearchServiceMock.createElasticsearchClient(),
          savedObjectsClientMock.create()
        ).asScoped(httpServerMock.createKibanaRequest());
      });

      it('rejects on listAgents', async () => {
        await expect(
          agentClient.listAgents({ showAgentless: true, showInactive: true })
        ).rejects.toThrowError(
          new FleetUnauthorizedError(
            `User does not have adequate permissions to access Fleet agents.`
          )
        );
      });

      it('rejects on getAgent', async () => {
        await expect(agentClient.getAgent('foo')).rejects.toThrowError(
          new FleetUnauthorizedError(
            `User does not have adequate permissions to access Fleet agents.`
          )
        );
      });

      it('rejects on getAgentStatusById', async () => {
        await expect(agentClient.getAgentStatusById('foo')).rejects.toThrowError(
          new FleetUnauthorizedError(
            `User does not have adequate permissions to access Fleet agents.`
          )
        );
      });

      it('rejects on getAgentStatusForAgentPolicy', async () => {
        await expect(agentClient.getAgentStatusForAgentPolicy()).rejects.toThrowError(
          new FleetUnauthorizedError(
            `User does not have adequate permissions to access Fleet agents.`
          )
        );
      });

      it('rejects on getLatestAgentAvailableVersion', async () => {
        await expect(agentClient.getLatestAgentAvailableVersion()).rejects.toThrowError(
          new FleetUnauthorizedError(
            `User does not have adequate permissions to access Fleet agents.`
          )
        );
      });
    });

    describe('with required privilege', () => {
      const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
      const mockSoClient = savedObjectsClientMock.create();

      beforeEach(() =>
        mockGetAuthzFromRequest.mockReturnValue(Promise.resolve(createFleetAuthzMock()))
      );
      expectApisToCallServicesSuccessfully(
        mockEsClient,
        () => mockedScopedSoClient,
        () =>
          new AgentServiceImpl(mockEsClient, mockSoClient).asScoped(
            httpServerMock.createKibanaRequest()
          ),
        'default'
      );
    });

    describe('with required privilege in a non default space', () => {
      const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
      const mockSoClient = savedObjectsClientMock.create();

      beforeEach(() => {
        mockGetAuthzFromRequest.mockReturnValue(Promise.resolve(createFleetAuthzMock()));
        jest.mocked(mockedScopedSoClient.getCurrentNamespace).mockReturnValue('test');
      });
      expectApisToCallServicesSuccessfully(
        mockEsClient,
        () => mockedScopedSoClient,
        () =>
          new AgentServiceImpl(mockEsClient, mockSoClient).asScoped(
            httpServerMock.createKibanaRequest()
          ),
        'test'
      );
    });
  });

  describe('asInternalUser', () => {
    const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    const mockSoClient = savedObjectsClientMock.create();
    expectApisToCallServicesSuccessfully(
      mockEsClient,
      () => mockSoClient,
      () => new AgentServiceImpl(mockEsClient, mockSoClient).asInternalUser
    );
  });

  describe('asInternalScopedUser', () => {
    it('should throw error if no space id is passed', () => {
      const agentService = new AgentServiceImpl(
        elasticsearchServiceMock.createElasticsearchClient(),
        savedObjectsClientMock.create()
      );

      expect(() => agentService.asInternalScopedUser('')).toThrowError(TypeError);
    });

    {
      const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
      const mockSoClient = savedObjectsClientMock.create();
      expectApisToCallServicesSuccessfully(
        mockEsClient,
        () => mockSoClient,
        () => new AgentServiceImpl(mockEsClient, mockSoClient).asInternalUser
      );
    }
  });
});

function expectApisToCallServicesSuccessfully(
  mockEsClient: ElasticsearchClient,
  getExpectedSoClient: () => jest.Mocked<SavedObjectsClientContract>,
  agentClientFactory: () => AgentClient,
  spaceId?: string
) {
  let agentClient: AgentClient;
  let mockSoClient: jest.Mocked<SavedObjectsClientContract>;
  beforeEach(() => {
    mockSoClient = getExpectedSoClient();
    agentClient = agentClientFactory();
  });

  test('client.listAgents calls getAgentsByKuery and returns results', async () => {
    mockGetAgentsByKuery.mockResolvedValue('getAgentsByKuery success');
    await expect(
      agentClient.listAgents({ showAgentless: true, showInactive: true })
    ).resolves.toEqual('getAgentsByKuery success');
    expect(mockGetAgentsByKuery).toHaveBeenCalledWith(mockEsClient, mockSoClient, {
      showAgentless: true,
      showInactive: true,
      spaceId,
    });
  });

  test('client.getAgent calls getAgentById and returns results', async () => {
    mockGetAgentById.mockResolvedValue('getAgentById success');
    await expect(agentClient.getAgent('foo-id')).resolves.toEqual('getAgentById success');
    expect(mockGetAgentById).toHaveBeenCalledWith(mockEsClient, mockSoClient, 'foo-id');
  });

  test('client.getAgentStatusById calls getAgentStatusById and returns results', async () => {
    mockGetAgentStatusById.mockResolvedValue('getAgentStatusById success');
    await expect(agentClient.getAgentStatusById('foo-id')).resolves.toEqual(
      'getAgentStatusById success'
    );
    expect(mockGetAgentStatusById).toHaveBeenCalledWith(mockEsClient, mockSoClient, 'foo-id');
  });

  test('client.getAgentStatusForAgentPolicy calls getAgentStatusForAgentPolicy and returns results', async () => {
    mockGetAgentStatusForAgentPolicy.mockResolvedValue('getAgentStatusForAgentPolicy success');
    await expect(agentClient.getAgentStatusForAgentPolicy('foo-id', 'foo-filter')).resolves.toEqual(
      'getAgentStatusForAgentPolicy success'
    );
    expect(mockGetAgentStatusForAgentPolicy).toHaveBeenCalledWith(
      mockEsClient,
      mockSoClient,
      'foo-id',
      'foo-filter',
      spaceId
    );
  });

  test('client.getLatestAgentAvailableVersion calls getLatestAvailableAgentVersion and returns results', async () => {
    mockgetLatestAvailableAgentVersion.mockResolvedValue('getLatestAvailableAgentVersion success');
    await expect(agentClient.getLatestAgentAvailableVersion()).resolves.toEqual(
      'getLatestAvailableAgentVersion success'
    );
    expect(mockgetLatestAvailableAgentVersion).toHaveBeenCalledTimes(1);
  });

  test('client.getLatestAgentAvailableBaseVersion strips away IAR suffix', async () => {
    mockgetLatestAvailableAgentVersion.mockResolvedValue('1.2.3+build12345678987654321');
    await expect(agentClient.getLatestAgentAvailableBaseVersion()).resolves.toEqual('1.2.3');
  });

  test('client.getLatestAgentAvailableBaseVersion does not break on usual version numbers', async () => {
    mockgetLatestAvailableAgentVersion.mockResolvedValue('8.17.0');
    await expect(agentClient.getLatestAgentAvailableBaseVersion()).resolves.toEqual('8.17.0');
  });

  test('client.getLatestAgentAvailableDockerImageVersion transforms IAR suffix', async () => {
    mockgetLatestAvailableAgentVersion.mockResolvedValue('1.2.3+build12345678987654321');
    await expect(agentClient.getLatestAgentAvailableDockerImageVersion()).resolves.toEqual(
      '1.2.3.build12345678987654321'
    );
  });

  test('client.getLatestAgentAvailableDockerImageVersion does not break on usual version numbers', async () => {
    mockgetLatestAvailableAgentVersion.mockResolvedValue('8.17.0');
    await expect(agentClient.getLatestAgentAvailableDockerImageVersion()).resolves.toEqual(
      '8.17.0'
    );
  });
}
