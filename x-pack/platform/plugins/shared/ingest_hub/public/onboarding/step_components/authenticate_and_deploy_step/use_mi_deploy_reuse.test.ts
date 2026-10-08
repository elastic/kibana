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
  ...jest.requireActual('./secret_refs'),
  fetchAgentlessSecretRefs: jest.fn(),
}));

import { deployGroup } from './deploy_groups';
import type { DeployGroup } from './deploy_groups';
import {
  cleanupManagedIntegrationsPolicies,
  updateManagedIntegrationsPolicy,
} from './policy_cleanup_managed_integrations';
import { fetchAgentlessSecretRefs } from './secret_refs';
import { useMiDeploy } from './use_mi_deploy';
import type { UseMiDeployParams } from './use_mi_deploy';

const mockDeployGroup = deployGroup as jest.Mock;
const mockCleanup = cleanupManagedIntegrationsPolicies as jest.Mock;
const mockUpdate = updateManagedIntegrationsPolicy as jest.Mock;
const mockFetchRefs = fetchAgentlessSecretRefs as jest.Mock;

const STORED_REFS = new Map([
  ['access_key_id', { isSecretRef: true as const, id: 'ref-akid' }],
  ['secret_access_key', { isSecretRef: true as const, id: 'ref-secret' }],
]);

function member(instanceId: string, isDuplicate = false) {
  return {
    instance: { instanceId, serviceId: instanceId, name: instanceId, isDuplicate },
    service: { id: instanceId, packageName: 'aws' } as never,
  };
}

/** One bundled group of the `aws` package covering the given instances. */
function makeBundle(instanceIds: string[], overrides: Partial<DeployGroup> = {}): DeployGroup {
  return {
    groupId: 'aws',
    instanceIds,
    members: instanceIds.map((id) => member(id)),
    isDuplicateGroup: false,
    namespace: '',
    ...overrides,
  };
}

function makeParams(overrides: Partial<UseMiDeployParams> = {}): UseMiDeployParams {
  return {
    // elb is deployed on policy-A; s3 was just added to the same package.
    deployGroups: [makeBundle(['elb', 's3'])],
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
    clearStagedStaticKeys: jest.fn(),
    setIsDeploying: jest.fn(),
    setFailedInstances: jest.fn(),
    createDeployment: jest.fn(),
    updateDeployment: jest.fn().mockResolvedValue(true),
    persistDeploymentId: jest.fn(),
    serviceStatuses: { elb: 'receiving' },
    failedInstances: [],
    onboardingDeploymentId: 'dep-1',
    policyIdsByInstance: { elb: 'policy-A' },
    pendingCleanupPolicyIds: undefined,
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

describe('useMiDeploy — reuse of an existing package policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchRefs.mockResolvedValue(STORED_REFS);
    mockCleanup.mockResolvedValue({ toDelete: [], toUpdate: [] });
    mockUpdate.mockResolvedValue(undefined);
    mockDeployGroup.mockResolvedValue({ policyId: 'policy-new' });
  });

  it('adds a service of a package that already has a policy to it with a PUT, not a POST', async () => {
    const updateDeployment = jest.fn().mockResolvedValue(true);
    const updateDetectAndReviewStep = jest.fn();
    await runDeploy(makeParams({ updateDeployment, updateDetectAndReviewStep }));

    expect(mockDeployGroup).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0]).toBe('policy-A');
    expect(mockUpdate.mock.calls[0][1]).toEqual(['elb', 's3']);
    // The policy's own refs are read by the update; no lookup is needed beforehand.
    expect(mockFetchRefs).not.toHaveBeenCalled();
    expect(updateDeployment).toHaveBeenCalledWith(
      'dep-1',
      expect.objectContaining({
        status: 'succeeded',
        packagePolicyIds: ['policy-A'],
        policyIdsByInstance: { elb: 'policy-A', s3: 'policy-A' },
      })
    );
    expect(updateDetectAndReviewStep).toHaveBeenLastCalledWith(
      expect.objectContaining({ policyIdsByInstance: { s3: 'policy-A' }, failedInstances: [] })
    );
  });

  it('marks only the added service failed when the update fails', async () => {
    mockUpdate.mockRejectedValue(new Error('boom'));
    const setFailedInstances = jest.fn();
    const updateDeployment = jest.fn().mockResolvedValue(true);
    await runDeploy(makeParams({ setFailedInstances, updateDeployment }));

    expect(setFailedInstances).toHaveBeenCalledWith(['s3']);
    expect(updateDeployment).toHaveBeenCalledWith(
      'dep-1',
      expect.objectContaining({
        status: 'failed',
        policyIdsByInstance: { elb: 'policy-A' },
      })
    );
  });

  it('creates a policy for a package that has none and updates the one that has', async () => {
    const other = {
      ...makeBundle(['rds'], { groupId: 'other' }),
      members: [member('rds')],
    };
    await runDeploy(
      makeParams({
        deployGroups: [makeBundle(['elb', 's3']), other],
        selectedServiceIds: ['elb', 's3', 'rds'],
      })
    );

    expect(mockUpdate.mock.calls[0][1]).toEqual(['elb', 's3']);
    expect(mockDeployGroup).toHaveBeenCalledTimes(1);
    expect(mockDeployGroup.mock.calls[0][0].instanceIds).toEqual(['rds']);
  });

  it('never reuses a policy for a duplicate instance', async () => {
    const duplicate: DeployGroup = {
      groupId: 's3-copy',
      instanceIds: ['s3-copy'],
      members: [member('s3-copy', true)],
      isDuplicateGroup: true,
      namespace: '',
    };
    await runDeploy(
      makeParams({
        deployGroups: [makeBundle(['elb']), duplicate],
        selectedServiceIds: ['elb', 's3'],
      })
    );

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockDeployGroup).toHaveBeenCalledTimes(1);
    expect(mockDeployGroup.mock.calls[0][0].instanceIds).toEqual(['s3-copy']);
  });

  it('writes a policy once when cleanup prunes it and a service is added', async () => {
    mockCleanup.mockResolvedValue({
      toDelete: [],
      toUpdate: [{ policyId: 'policy-A', survivingInstanceIds: ['elb'] }],
    });
    await runDeploy(
      makeParams({
        policyIdsByInstance: { elb: 'policy-A', gone: 'policy-A' },
        pendingCleanupPolicyIds: { gone: 'policy-A' },
      })
    );

    // The cleanup update carries the added service; no second PUT and no POST.
    expect(mockCleanup.mock.calls[0][0].extraMembersByPolicy).toEqual({ 'policy-A': ['s3'] });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockDeployGroup).not.toHaveBeenCalled();
  });

  it('writes the policy itself when the cleanup update failed', async () => {
    mockCleanup.mockResolvedValue({ toDelete: [], toUpdate: [] });
    await runDeploy(
      makeParams({
        policyIdsByInstance: { elb: 'policy-A', gone: 'policy-A' },
        pendingCleanupPolicyIds: { gone: 'policy-A' },
      })
    );

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][1]).toEqual(['elb', 's3']);
  });

  it('writes a policy once when it is changed, pruned and added to in the same run', async () => {
    mockCleanup.mockImplementation(async (opts: { skipUpdatePolicyIds: Set<string> }) => ({
      toDelete: [],
      // What the real cleanup reports for a policy a dirty update already wrote.
      toUpdate: opts.skipUpdatePolicyIds.has('policy-A')
        ? [{ policyId: 'policy-A', survivingInstanceIds: ['elb'] }]
        : [],
    }));
    await runDeploy(
      makeParams({
        isDirty: true,
        policyIdsByInstance: { elb: 'policy-A', gone: 'policy-A' },
        pendingCleanupPolicyIds: { gone: 'policy-A' },
      })
    );

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    // Surviving member plus the added one; the removed instance is not part of the write.
    expect(mockUpdate.mock.calls[0][1]).toEqual(['elb', 's3']);
    expect(mockDeployGroup).not.toHaveBeenCalled();
  });

  it('uses the secret an earlier cleanup update stored instead of storing the typed keys again', async () => {
    // Cleanup updated another policy and stored the typed keys there; policy-A is written after.
    mockCleanup.mockResolvedValue({
      toDelete: [],
      toUpdate: [{ policyId: 'policy-B', survivingInstanceIds: ['rds'] }],
      sharedRefs: STORED_REFS,
    });
    await runDeploy(
      makeParams({
        pendingCleanupPolicyIds: { gone: 'policy-B' },
        policyIdsByInstance: { elb: 'policy-A', rds: 'policy-B', gone: 'policy-B' },
        authenticateAndDeployStep: {
          staticKeys: { access_key_id: 'AKID', secret_access_key: 'SECRET' },
        },
      })
    );

    const step = mockUpdate.mock.calls[0][2].authenticateAndDeployStep;
    expect(step.existingSecretRefs).toBe(STORED_REFS);
    expect(step.staticKeys).toEqual({ access_key_id: '', secret_access_key: '' });
  });

  it('stores typed keys once across a dirty update and new policies', async () => {
    const other = { ...makeBundle(['rds'], { groupId: 'other' }), members: [member('rds')] };
    await runDeploy(
      makeParams({
        deployGroups: [makeBundle(['elb', 's3']), other],
        selectedServiceIds: ['elb', 's3', 'rds'],
        isDirty: true,
        authenticateAndDeployStep: {
          authMethod: 'static_keys',
          staticKeys: { access_key_id: 'AKID', secret_access_key: 'SECRET' },
        },
      })
    );

    // The dirty update (typed keys) writes policy-A with the added service in one PUT and stores
    // the secret; the new policy for the other package uses it.
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][1]).toEqual(['elb', 's3']);
    expect(mockUpdate.mock.calls[0][2].authenticateAndDeployStep.staticKeys).toEqual({
      access_key_id: 'AKID',
      secret_access_key: 'SECRET',
    });
    expect(mockDeployGroup.mock.calls[0][1].authenticateAndDeployStep.existingSecretRefs).toBe(
      STORED_REFS
    );
  });
});
