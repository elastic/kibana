/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { createAppContextStartContractMock } from '../mocks';

import { agentPolicyUpdateEventHandler } from './agent_policy_update';
import { appContextService } from './app_context';
import { getAgentById, getAgentPolicyForAgent, getAgentsByKuery } from './agents';
import * as apiKeys from './api_keys';

jest.mock('./agents/crud', () => ({
  ...jest.requireActual('./agents/crud'),
  getAgentsByKuery: jest.fn(),
  getAgentById: jest.fn(),
  getAgentPolicyForAgent: jest.fn(),
}));
jest.mock('./api_keys');
jest.mock('./agent_policy', () => ({
  agentPolicyService: {
    deployPolicy: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('./secrets', () => ({
  isActionSecretStorageEnabled: jest.fn(),
}));

describe('agentPolicyUpdateEventHandler', () => {
  describe('soClient selection', () => {
    let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
    let withSpaceExtClient: ReturnType<typeof savedObjectsClientMock.create>;
    let withoutSpaceExtClient: ReturnType<typeof savedObjectsClientMock.create>;

    beforeEach(() => {
      esClient = elasticsearchServiceMock.createElasticsearchClient();
      withSpaceExtClient = savedObjectsClientMock.create();
      withoutSpaceExtClient = savedObjectsClientMock.create();

      appContextService.start(
        createAppContextStartContractMock({}, false, {
          internal: withSpaceExtClient,
          withoutSpaceExtensions: withoutSpaceExtClient,
        })
      );

      jest.mocked(apiKeys.generateEnrollmentAPIKey).mockResolvedValue({} as any);
    });

    afterEach(() => {
      appContextService.stop();
    });

    it('uses WithoutSpaceExtension client when spaceId is undefined to avoid _has_privileges call', async () => {
      await agentPolicyUpdateEventHandler(esClient, 'created', 'policy-1', {
        skipDeploy: true,
      });

      expect(apiKeys.generateEnrollmentAPIKey).toHaveBeenCalledWith(
        withoutSpaceExtClient,
        esClient,
        expect.objectContaining({ agentPolicyId: 'policy-1' })
      );
      expect(apiKeys.generateEnrollmentAPIKey).not.toHaveBeenCalledWith(
        withSpaceExtClient,
        expect.anything(),
        expect.anything()
      );
    });

    it('uses space-scoped client when spaceId is a specific space', async () => {
      const scopedClient = savedObjectsClientMock.create();
      // getInternalUserSOClientForSpaceId('test') calls asScopedToNamespace — mock it via
      // getUnsafeInternalClient returning a client whose asScopedToNamespace returns scopedClient
      withSpaceExtClient.asScopedToNamespace = jest.fn().mockReturnValue(scopedClient);

      await agentPolicyUpdateEventHandler(esClient, 'created', 'policy-1', {
        spaceId: 'test',
        skipDeploy: true,
      });

      expect(apiKeys.generateEnrollmentAPIKey).toHaveBeenCalledWith(
        scopedClient,
        esClient,
        expect.objectContaining({ agentPolicyId: 'policy-1' })
      );
    });
  });

  describe('deleted', () => {
    it('should unenroll agentless agents', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      appContextService.start(createAppContextStartContractMock());
      jest.mocked(apiKeys.generateEnrollmentAPIKey).mockResolvedValue({} as any);

      jest
        .mocked(getAgentsByKuery)
        .mockResolvedValueOnce({
          agents: [{ id: 'agent1' }],
        } as any)
        .mockResolvedValueOnce({
          agents: [],
        } as any);
      jest.mocked(getAgentById).mockResolvedValue({
        id: 'agent1',
      } as any);
      jest.mocked(getAgentPolicyForAgent).mockResolvedValue({
        supports_agentless: true,
      } as any);
      await agentPolicyUpdateEventHandler(esClient, 'deleted', 'test1');

      expect(esClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'agent1',
          doc: expect.objectContaining({
            unenrollment_started_at: expect.anything(),
          }),
        })
      );
    });
  });
});
