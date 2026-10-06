/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

jest.mock('./deploy_groups', () => ({
  ...jest.requireActual('./deploy_groups'),
  deployGroup: jest.fn(),
}));

jest.mock('./policy_cleanup_managed_integrations', () => ({
  cleanupManagedIntegrationsPolicies: jest.fn(),
  updateManagedIntegrationsPolicy: jest.fn(),
}));

jest.mock('./secret_refs', () => ({
  fetchAgentlessSecretRefs: jest.fn(),
}));

import { deployGroup } from './deploy_groups';
import type { DeployGroup } from './deploy_groups';
import { cleanupManagedIntegrationsPolicies } from './policy_cleanup_managed_integrations';
import { fetchAgentlessSecretRefs } from './secret_refs';
import { useMiDeploy } from './use_mi_deploy';
import type { UseMiDeployParams } from './use_mi_deploy';

const mockDeployGroup = deployGroup as jest.Mock;
const mockCleanup = cleanupManagedIntegrationsPolicies as jest.Mock;
const mockFetchRefs = fetchAgentlessSecretRefs as jest.Mock;

const KEPT_REFS = new Map([['secret_access_key', { isSecretRef: true as const, id: 'ref-1' }]]);

function makeGroup(instanceId: string): DeployGroup {
  return {
    groupId: instanceId,
    instanceIds: [instanceId],
    members: [
      {
        instance: { instanceId, serviceId: instanceId, name: instanceId, isDuplicate: false },
        service: { id: instanceId } as never,
      },
    ],
    isDuplicateGroup: false,
    namespace: '',
  };
}

function makeParams(overrides: Partial<UseMiDeployParams> = {}): UseMiDeployParams {
  return {
    // elb is deployed already (its policy is the source of the stored secrets); s3 is new.
    deployGroups: [makeGroup('elb'), makeGroup('s3')],
    nonAgentlessServices: [],
    serviceSettings: { globalRegion: 'us-east-1', serviceVars: {}, instances: [] },
    authenticateAndDeployStep: {},
    namespace: 'default',
    selectedServiceIds: ['elb', 's3'],
    dataFormat: 'ecs',
    servicesMap: new Map(),
    hasEcfServices: false,
    onContinue: jest.fn(),
    updateDetectAndReviewStep: jest.fn(),
    removeDeployInstances: jest.fn(),
    getLatestFailedInstances: jest.fn().mockReturnValue([]),
    persistPendingIacTemplate: jest.fn().mockResolvedValue(undefined),
    setIsDeploying: jest.fn(),
    setFailedInstances: jest.fn(),
    createDeployment: jest.fn(),
    updateDeployment: jest.fn().mockResolvedValue(true),
    persistDeploymentId: jest.fn(),
    serviceStatuses: { elb: 'receiving' },
    failedInstances: [],
    onboardingDeploymentId: 'dep-1',
    policyIdsByInstance: { elb: 'policy-A' },
    pendingCleanupPolicyIds: { removed: 'policy-X' },
    isDirty: false,
    isAuthDirty: false,
    ...overrides,
  } as UseMiDeployParams;
}

async function runDeploy(params: UseMiDeployParams) {
  const { result } = renderHook(() => useMiDeploy(params));
  await act(async () => {
    await result.current();
  });
}

describe('useMiDeploy — kept secret refs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchRefs.mockResolvedValue(KEPT_REFS);
    mockCleanup.mockResolvedValue({ toDelete: ['policy-X'], toUpdate: [] });
    mockDeployGroup.mockResolvedValue({ policyId: 'policy-B' });
  });

  it('reads the refs of a deployed policy before cleanup runs and hands them to the new policies', async () => {
    await runDeploy(makeParams());

    expect(mockFetchRefs).toHaveBeenCalledWith('policy-A');
    expect(mockCleanup).toHaveBeenCalledTimes(1);
    expect(mockFetchRefs.mock.invocationCallOrder[0]).toBeLessThan(
      mockCleanup.mock.invocationCallOrder[0]
    );

    expect(mockDeployGroup).toHaveBeenCalledTimes(1);
    const [group, opts] = mockDeployGroup.mock.calls[0];
    expect(group.instanceIds).toEqual(['s3']);
    expect(opts.authenticateAndDeployStep.existingSecretRefs).toBe(KEPT_REFS);
    // Cleanup updates policies in place and reads each policy's own refs.
    expect(mockCleanup.mock.calls[0][0].authenticateAndDeployStep).not.toHaveProperty(
      'existingSecretRefs'
    );
  });

  it('marks the run as deploying before it awaits the lookup', async () => {
    const setIsDeploying = jest.fn();
    await runDeploy(makeParams({ setIsDeploying }));

    expect(setIsDeploying.mock.invocationCallOrder[0]).toBeLessThan(
      mockFetchRefs.mock.invocationCallOrder[0]
    );
    expect(setIsDeploying).toHaveBeenCalledWith(true);
  });

  it('takes the refs from a policy that cleanup keeps, not one it deletes', async () => {
    await runDeploy(
      makeParams({
        policyIdsByInstance: { removed: 'policy-X', elb: 'policy-A' },
        pendingCleanupPolicyIds: { removed: 'policy-X' },
      })
    );

    expect(mockFetchRefs).toHaveBeenCalledTimes(1);
    expect(mockFetchRefs).toHaveBeenCalledWith('policy-A');
  });

  it('has no source for the refs when every deployed policy is being removed', async () => {
    mockFetchRefs.mockImplementation(async (id?: string) => (id ? KEPT_REFS : new Map()));
    await runDeploy(
      makeParams({
        deployGroups: [makeGroup('s3')],
        serviceStatuses: {},
        policyIdsByInstance: { removed: 'policy-X' },
        pendingCleanupPolicyIds: { removed: 'policy-X' },
      })
    );

    expect(mockFetchRefs).not.toHaveBeenCalledWith('policy-X');
    expect(mockDeployGroup.mock.calls[0][1].authenticateAndDeployStep.existingSecretRefs.size).toBe(
      0
    );
  });

  it('does not look anything up when there is nothing new to create', async () => {
    mockCleanup.mockResolvedValue({ toDelete: ['policy-X'], toUpdate: [] });
    await runDeploy(makeParams({ deployGroups: [makeGroup('elb')] }));

    expect(mockFetchRefs).not.toHaveBeenCalled();
    expect(mockDeployGroup).not.toHaveBeenCalled();
  });

  it('skips the lookup when both keys were typed', async () => {
    await runDeploy(
      makeParams({
        authenticateAndDeployStep: {
          staticKeys: { access_key_id: 'AKID', secret_access_key: 'SECRET' },
        },
      })
    );

    expect(mockFetchRefs).not.toHaveBeenCalled();
    expect(mockDeployGroup.mock.calls[0][1].authenticateAndDeployStep.existingSecretRefs).toBe(
      undefined
    );
  });

  it('still looks the refs up when only one key was typed', async () => {
    await runDeploy(
      makeParams({
        authenticateAndDeployStep: { staticKeys: { access_key_id: 'AKID', secret_access_key: '' } },
      })
    );

    expect(mockFetchRefs).toHaveBeenCalledWith('policy-A');
  });

  it('skips the lookup when the policies authenticate through an identity', async () => {
    await runDeploy(
      makeParams({
        authenticateAndDeployStep: { connectorId: 'conn-1', authMethod: 'identity_federation' },
      })
    );

    expect(mockFetchRefs).not.toHaveBeenCalled();
    expect(mockDeployGroup.mock.calls[0][1].authenticateAndDeployStep.existingSecretRefs).toBe(
      undefined
    );
  });
});
