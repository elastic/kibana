/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';

import { createAppContextStartContractMock, createPackagePolicyServiceMock } from '../../mocks';
import { getPackageInfo } from '../epm/packages';
import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';

import { AgentlessPoliciesServiceImpl } from './agentless_policies';

jest.mock('../epm/packages/get');

jest.mock('../agent_policy');

describe('AgentlessPoliciesService', () => {
  describe('createAgentlessPolicy', () => {
    let packagePolicyService: ReturnType<typeof createPackagePolicyServiceMock>;
    beforeEach(() => {
      const cloudSetup = cloudMock.createSetup();
      cloudSetup.isCloudEnabled = true;

      appContextService.start({
        ...createAppContextStartContractMock({
          agentless: { enabled: true },
        }),
        cloud: cloudSetup,
      });

      jest.resetAllMocks();
      packagePolicyService = createPackagePolicyServiceMock();
      packagePolicyService.create.mockImplementation(async (_, __, policy, opts) => {
        return {
          id: opts?.id || 'new-agentless-package-policy-id',
          name: policy.name,
          package: policy.package,
          inputs: [],
          namespace: policy.namespace,
          revision: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'system',
          updated_by: 'system',
          enabled: true,
          policy_ids: policy.policy_ids || [],
        };
      });

      jest.mocked(agentPolicyService.create).mockImplementationOnce(async (_, __, policy, opts) => {
        return {
          id: opts?.id || 'new-agentless-policy-id',
          status: 'active',
          name: policy.name,
          namespace: policy.namespace,
          is_managed: policy.is_managed || false,
          revision: 1,
          created_at: new Date().toISOString(),
          is_protected: false,
          updated_at: new Date().toISOString(),
          updated_by: 'system',
        };
      });
      jest.mocked(agentPolicyService.delete).mockImplementationOnce(async () => ({} as any));

      jest.mocked(getPackageInfo).mockImplementation(async ({ pkgName, pkgVersion }) => {
        if (pkgName === 'agentless_integration') {
          return {
            name: 'agentless_integration',
            version: '1.0.0',
            policy_templates: [
              {
                name: 'agentless_template',
                deployment_modes: ['agentless'],
              },
            ],
          } as any;
        }
        throw new Error('Package not found in mock');
      });
    });

    it('should create a new agentless policy', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const logger = loggingSystemMock.createLogger();

      const agentlessPoliciesService = new AgentlessPoliciesServiceImpl(
        packagePolicyService,
        soClient,
        esClient,
        logger
      );

      const result = await agentlessPoliciesService.createAgentlessPolicy({
        name: 'Test Agentless Policy',
        namespace: 'default',
        package: {
          name: 'agentless_integration',
          version: '1.0.0',
        },
        inputs: {},
      });

      expect(result).toBeDefined();

      expect(jest.mocked(agentPolicyService.create)).toHaveBeenCalledTimes(1);
      expect(jest.mocked(agentPolicyService.create)).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          supports_agentless: true,
        }),
        expect.objectContaining({})
      );
      expect(jest.mocked(packagePolicyService.create)).toHaveBeenCalledTimes(1);
      expect(jest.mocked(packagePolicyService.create)).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          supports_agentless: true,
        }),
        expect.anything(),
        undefined,
        undefined
      );
      expect(jest.mocked(agentPolicyService.deployPolicy)).toHaveBeenCalledTimes(1);
      expect(jest.mocked(agentPolicyService.deployPolicy)).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        undefined,
        expect.objectContaining({
          throwOnAgentlessError: true,
        })
      );
    });

    it('should delete agent policy if an error occurs during package policy creation', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const logger = loggingSystemMock.createLogger();

      const agentlessPoliciesService = new AgentlessPoliciesServiceImpl(
        packagePolicyService,
        soClient,
        esClient,
        logger
      );
      jest.mocked(packagePolicyService.create).mockImplementationOnce(async () => {
        throw new Error('Error creating package policy');
      });

      await expect(() =>
        agentlessPoliciesService.createAgentlessPolicy({
          id: 'test-agentless-policy-id',
          name: 'Test Agentless Policy',
          namespace: 'default',
          package: {
            name: 'agentless_integration',
            version: '1.0.0',
          },
          inputs: {},
        })
      ).rejects.toThrow('Error creating package policy');

      expect(jest.mocked(agentPolicyService.create)).toHaveBeenCalledTimes(1);

      expect(jest.mocked(agentPolicyService.delete)).toHaveBeenCalledTimes(1);
      expect(jest.mocked(agentPolicyService.delete)).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'test-agentless-policy-id',
        expect.objectContaining({
          force: true,
        })
      );
    });

    it('should delete agent policy if an error occurs during deployment', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const logger = loggingSystemMock.createLogger();

      const agentlessPoliciesService = new AgentlessPoliciesServiceImpl(
        packagePolicyService,
        soClient,
        esClient,
        logger
      );
      jest.mocked(agentPolicyService.deployPolicy).mockImplementationOnce(async () => {
        throw new Error('Error calling agentless API');
      });

      await expect(() =>
        agentlessPoliciesService.createAgentlessPolicy({
          id: 'test-agentless-policy-id',
          name: 'Test Agentless Policy',
          namespace: 'default',
          package: {
            name: 'agentless_integration',
            version: '1.0.0',
          },
          inputs: {},
        })
      ).rejects.toThrow('Error calling agentless API');

      expect(jest.mocked(agentPolicyService.create)).toHaveBeenCalledTimes(1);
      expect(jest.mocked(packagePolicyService.create)).toHaveBeenCalledTimes(1);

      expect(jest.mocked(agentPolicyService.delete)).toHaveBeenCalledTimes(1);
      expect(jest.mocked(agentPolicyService.delete)).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'test-agentless-policy-id',
        expect.objectContaining({
          force: true,
        })
      );
    });
  });

  describe('deleteAgentlessPolicy', () => {
    let packagePolicyService: ReturnType<typeof createPackagePolicyServiceMock>;
    beforeEach(() => {
      const cloudSetup = cloudMock.createSetup();
      cloudSetup.isCloudEnabled = true;

      appContextService.start({
        ...createAppContextStartContractMock({
          agentless: { enabled: true },
        }),
        cloud: cloudSetup,
      });

      jest.resetAllMocks();
      packagePolicyService = createPackagePolicyServiceMock();

      jest.mocked(agentPolicyService.delete).mockImplementationOnce(async () => ({} as any));
    });

    it('should delete an existing agentless policy', async () => {
      jest.mocked(agentPolicyService.get).mockResolvedValueOnce({
        supports_agentless: true,
      } as any);

      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const logger = loggingSystemMock.createLogger();

      const agentlessPoliciesService = new AgentlessPoliciesServiceImpl(
        packagePolicyService,
        soClient,
        esClient,
        logger
      );

      await agentlessPoliciesService.deleteAgentlessPolicy('existing-agentless-policy-id');

      expect(jest.mocked(agentPolicyService.delete)).toHaveBeenCalledTimes(1);
      expect(jest.mocked(agentPolicyService.delete)).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'existing-agentless-policy-id',
        expect.objectContaining({})
      );
    });

    it('should throw when deleting a non agentless policy', async () => {
      jest.mocked(agentPolicyService.get).mockResolvedValueOnce({
        supports_agentless: false,
      } as any);

      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const logger = loggingSystemMock.createLogger();

      const agentlessPoliciesService = new AgentlessPoliciesServiceImpl(
        packagePolicyService,
        soClient,
        esClient,
        logger
      );

      await expect(() =>
        agentlessPoliciesService.deleteAgentlessPolicy('non-agentless-policy-id')
      ).rejects.toThrow(`Policy non-agentless-policy-id is not an agentless policy`);

      expect(jest.mocked(agentPolicyService.delete)).toHaveBeenCalledTimes(0);
    });
  });
});
