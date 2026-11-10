/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import type { PackagePolicy } from '../../../common/types';
import { appContextService, packagePolicyService } from '../../services';
import { AgentlessPoliciesServiceImpl } from '../../services/agentless/agentless_policies';
import type { FleetRequestHandlerContext } from '../../types';

import {
  bulkUpgradeAgentlessPoliciesHandler,
  deleteAgentlessPolicyHandler,
  updateAgentlessPolicyHandler,
} from './handler';

jest.mock('../../services/agentless/agentless_policies');

const agentlessService =
  AgentlessPoliciesServiceImpl.prototype as jest.Mocked<AgentlessPoliciesServiceImpl>;

const ONBOARDING_ONLY = /can only be changed from the onboarding flow/;

describe('managed integrations handlers: policies managed by a cloud onboarding instance', () => {
  const context = {
    core: Promise.resolve({
      savedObjects: { client: savedObjectsClientMock.create() },
      elasticsearch: { client: elasticsearchServiceMock.createScopedClusterClient() },
    }),
    fleet: Promise.resolve({ packagePolicyService: { asCurrentUser: {} } }),
  } as unknown as FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    jest.clearAllMocks();
    response = httpServerMock.createResponseFactory();
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(loggingSystemMock.createLogger());
    jest.spyOn(packagePolicyService, 'getByIDs').mockResolvedValue([
      { id: 'managed', name: 'aws-managed', onboarding_deployment_id: 'deploy-1' },
      { id: 'other', name: 'aws-other' },
    ] as PackagePolicy[]);
  });

  describe('update', () => {
    const updateRequest = (query = {}) =>
      httpServerMock.createKibanaRequest({
        params: { policyId: 'managed' },
        query,
        body: { name: 'aws-managed', package: { name: 'aws', version: '1.0.0' } },
      });

    it('rejects an update without the id of the onboarding instance that manages the policy', async () => {
      for (const query of [{}, { onboarding_deployment_id: 'deploy-2' }]) {
        await expect(
          updateAgentlessPolicyHandler(context, updateRequest(query) as any, response)
        ).rejects.toThrow(ONBOARDING_ONLY);
      }
      expect(agentlessService.updateAgentlessPolicy).not.toHaveBeenCalled();
    });

    it('updates the policy with the id of the onboarding instance that manages it', async () => {
      await updateAgentlessPolicyHandler(
        context,
        updateRequest({ onboarding_deployment_id: 'deploy-1' }) as any,
        response
      );

      expect(agentlessService.updateAgentlessPolicy).toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const deleteRequest = (query = {}) =>
      httpServerMock.createKibanaRequest({ params: { policyId: 'managed' }, query });

    it('rejects a delete without the id of the onboarding instance that manages the policy', async () => {
      await expect(
        deleteAgentlessPolicyHandler(context, deleteRequest() as any, response)
      ).rejects.toThrow(ONBOARDING_ONLY);
      expect(agentlessService.deleteAgentlessPolicy).not.toHaveBeenCalled();
    });

    it('deletes the policy with the id of the onboarding instance that manages it', async () => {
      await deleteAgentlessPolicyHandler(
        context,
        deleteRequest({ onboarding_deployment_id: 'deploy-1' }) as any,
        response
      );

      expect(agentlessService.deleteAgentlessPolicy).toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalled();
    });
  });

  it('upgrades the managed policies without the id of the onboarding instance, as upgrades keep their configuration', async () => {
    await bulkUpgradeAgentlessPoliciesHandler(
      context,
      httpServerMock.createKibanaRequest({ body: { policyIds: ['managed', 'other'] } }) as any,
      response
    );

    expect(agentlessService.bulkUpgradeAgentlessPolicies).toHaveBeenCalledWith(
      ['managed', 'other'],
      expect.anything(),
      expect.anything()
    );
  });
});
