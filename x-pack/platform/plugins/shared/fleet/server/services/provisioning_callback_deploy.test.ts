/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import type { CloudConnectorCallback } from '../../common/types/models/provisioning_callback';
import type {
  CloudOnboardingDeployment,
  PendingAgentlessPolicy,
} from '../../common/types/models/cloud_onboarding_deployment';

import { appContextService } from './app_context';
import { cloudOnboardingDeploymentService } from './cloud_onboarding_deployment';
import { provisioningCallbackService } from './provisioning_callback';
import { packagePolicyService } from './package_policy';
import { AgentlessPoliciesServiceImpl } from './agentless/agentless_policies';
import { deployProvisioningCallback } from './provisioning_callback_deploy';

jest.mock('./app_context');
jest.mock('./cloud_onboarding_deployment');
jest.mock('./provisioning_callback');
jest.mock('./package_policy');
jest.mock('./agentless/agentless_policies');

const mockedDeployments = jest.mocked(cloudOnboardingDeploymentService);
const mockedCallbacks = jest.mocked(provisioningCallbackService);
const mockedPackagePolicies = jest.mocked(packagePolicyService);
const createAgentlessPolicy = jest.mocked(
  AgentlessPoliciesServiceImpl.prototype.createAgentlessPolicy
);

const entry = (id: string, instanceIds: string[]): PendingAgentlessPolicy => ({
  id,
  instanceIds,
  request: {
    name: `aws-${id}`,
    namespace: 'default',
    package: { name: 'aws', version: '3.0.0' },
    inputs: {},
  },
});

const RECORD: CloudConnectorCallback = {
  id: 'cb-1',
  provider: 'aws',
  status: 'received',
  created_at: '2026-10-22T10:00:00.000Z',
  created_by: 'elastic',
  space_id: 'marketing',
  expires_at: '2026-10-22T12:00:00.000Z',
  cloud_connector_id: 'cc-1',
  onboarding_deployment_id: 'dep-1',
  deploy_status: 'pending',
};

const DEPLOYMENT: CloudOnboardingDeployment = {
  id: 'dep-1',
  provider: 'aws',
  mechanisms: ['managed_integration'],
  services: ['cloudtrail', 'elb', 's3'],
  status: 'pending',
  attemptCount: 1,
  pendingAgentlessPolicies: [entry('pp-1', ['a', 'b']), entry('pp-2', ['c'])],
};

describe('deployProvisioningCallback', () => {
  const spaceSoClient = savedObjectsClientMock.create();
  const recordSoClient = savedObjectsClientMock.create();
  const internalSoClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(appContextService.getLogger).mockReturnValue(loggerMock.create());
    internalSoClient.asScopedToNamespace.mockReturnValue(spaceSoClient);
    jest.mocked(appContextService.getInternalUserSOClient).mockReturnValue(internalSoClient);
    jest
      .mocked(appContextService.getInternalUserSOClientWithoutSpaceExtension)
      .mockReturnValue(recordSoClient);
    jest
      .mocked(appContextService.getInternalUserESClient)
      .mockReturnValue(elasticsearchServiceMock.createClusterClient().asInternalUser);
    mockedCallbacks.get.mockResolvedValue(RECORD);
    mockedCallbacks.updateDeployStage.mockResolvedValue(undefined);
    mockedDeployments.getById.mockResolvedValue(DEPLOYMENT);
    // The update input allows null to clear a field; the stored shape never holds null.
    mockedDeployments.update.mockImplementation(
      async (_, id, update) => ({ ...DEPLOYMENT, ...update, id } as CloudOnboardingDeployment)
    );
    // A missing policy is a thrown not-found, as the real service behaves.
    mockedPackagePolicies.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('fleet-agent-policies', 'pp-x')
    );
    createAgentlessPolicy.mockImplementation(async (data) => ({ id: data.id } as any));
  });

  it('does nothing when the record is not received with a pending deploy', async () => {
    mockedCallbacks.get.mockResolvedValue({ ...RECORD, status: 'pending' });
    await deployProvisioningCallback('cb-1');
    mockedCallbacks.get.mockResolvedValue({ ...RECORD, deploy_status: 'deployed' });
    await deployProvisioningCallback('cb-1');
    mockedCallbacks.get.mockResolvedValue({ ...RECORD, onboarding_deployment_id: undefined });
    await deployProvisioningCallback('cb-1');

    expect(mockedDeployments.update).not.toHaveBeenCalled();
    expect(mockedCallbacks.updateDeployStage).not.toHaveBeenCalled();
    expect(createAgentlessPolicy).not.toHaveBeenCalled();
  });

  it('creates every stored policy for the identity and marks both objects done', async () => {
    await deployProvisioningCallback('cb-1');

    // Scoped explicitly to the launch space: the policy services need the spaces extension.
    expect(internalSoClient.asScopedToNamespace).toHaveBeenCalledWith('marketing');
    expect(createAgentlessPolicy).toHaveBeenCalledTimes(2);
    expect(createAgentlessPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'pp-1',
        name: 'aws-pp-1',
        cloud_connector: { enabled: true, cloud_connector_id: 'cc-1', target_csp: 'aws' },
      }),
      undefined,
      undefined,
      { createdBy: 'elastic' }
    );
    expect(mockedDeployments.update).toHaveBeenLastCalledWith(spaceSoClient, 'dep-1', {
      status: 'succeeded',
      // The identity the stack created is the deployment's connector from now on, as a Deploy
      // click would have recorded it.
      connectorId: 'cc-1',
      packagePolicyIds: ['pp-1', 'pp-2'],
      policyIdsByInstance: { a: 'pp-1', b: 'pp-1', c: 'pp-2' },
    });
    expect(mockedCallbacks.updateDeployStage).toHaveBeenLastCalledWith(recordSoClient, 'cb-1', {
      deploy_status: 'deployed',
    });
  });

  it('scopes to the default space when the record has none', async () => {
    mockedCallbacks.get.mockResolvedValue({ ...RECORD, space_id: undefined });

    await deployProvisioningCallback('cb-1');

    expect(internalSoClient.asScopedToNamespace).toHaveBeenCalledWith('default');
  });

  it('marks the deployment deploying before creating anything', async () => {
    const order: string[] = [];
    mockedDeployments.update.mockImplementation(async (_, id, update) => {
      order.push(`deployment:${update.status}`);
      return { ...DEPLOYMENT, ...update, id } as CloudOnboardingDeployment;
    });
    mockedCallbacks.updateDeployStage.mockImplementation(async (_, __, stage) => {
      order.push(`record:${stage.deploy_status}`);
    });
    createAgentlessPolicy.mockImplementation(async (data) => {
      order.push(`create:${data.id}`);
      return { id: data.id } as any;
    });

    await deployProvisioningCallback('cb-1');

    expect(order.slice(0, 2).sort()).toEqual(['deployment:deploying', 'record:deploying']);
    expect(order.indexOf('create:pp-1')).toBeGreaterThan(1);
  });

  it('records a per-policy failure and marks the deployment failed', async () => {
    createAgentlessPolicy.mockImplementation(async (data) => {
      if (data.id === 'pp-2') {
        throw new Error('package not installed');
      }
      return { id: data.id } as any;
    });

    await deployProvisioningCallback('cb-1');

    expect(mockedDeployments.update).toHaveBeenLastCalledWith(spaceSoClient, 'dep-1', {
      status: 'failed',
      connectorId: 'cc-1',
      statusMessage: expect.stringContaining('package not installed'),
      packagePolicyIds: ['pp-1'],
      policyIdsByInstance: { a: 'pp-1', b: 'pp-1' },
    });
    const [, , stage] = mockedCallbacks.updateDeployStage.mock.lastCall!;
    expect(stage.deploy_status).toBe('failed');
    expect(stage.deploy_error).toContain('package not installed');
    expect(stage.deploy_error).toContain('c');
  });

  it('treats a policy that already exists under the pre-assigned id as created', async () => {
    mockedPackagePolicies.get.mockImplementation(async (_, id) => {
      if (id === 'pp-1') {
        return { id } as any;
      }
      throw SavedObjectsErrorHelpers.createGenericNotFoundError('fleet-agent-policies', id);
    });

    await deployProvisioningCallback('cb-1');

    expect(createAgentlessPolicy).toHaveBeenCalledTimes(1);
    expect(createAgentlessPolicy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pp-2' }),
      undefined,
      undefined,
      { createdBy: 'elastic' }
    );
    expect(mockedDeployments.update).toHaveBeenLastCalledWith(
      spaceSoClient,
      'dep-1',
      expect.objectContaining({ status: 'succeeded', packagePolicyIds: ['pp-1', 'pp-2'] })
    );
  });

  it('counts a lookup that fails for another reason as that policy failing', async () => {
    mockedPackagePolicies.get.mockRejectedValue(new Error('es unavailable'));

    await deployProvisioningCallback('cb-1');

    expect(createAgentlessPolicy).not.toHaveBeenCalled();
    expect(mockedDeployments.update).toHaveBeenLastCalledWith(
      spaceSoClient,
      'dep-1',
      expect.objectContaining({
        status: 'failed',
        statusMessage: expect.stringContaining('es unavailable'),
      })
    );
  });

  it('never throws: an unexpected failure is written to the record', async () => {
    mockedDeployments.getById.mockRejectedValue(new Error('es down'));

    await expect(deployProvisioningCallback('cb-1')).resolves.toBeUndefined();

    expect(mockedCallbacks.updateDeployStage).toHaveBeenLastCalledWith(recordSoClient, 'cb-1', {
      deploy_status: 'failed',
      deploy_error: expect.stringContaining('es down'),
    });
  });
});
