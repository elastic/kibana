/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';

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

const KEPT_REFS = new Map([['secret_access_key', { isSecretRef: true as const, id: 'ref-1' }]]);
// A package whose credential vars are all secrets: the refs cover every typed value.
const FULL_REFS = new Map([
  ['access_key_id', { isSecretRef: true as const, id: 'ref-akid' }],
  ['secret_access_key', { isSecretRef: true as const, id: 'ref-1' }],
]);

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

  it('drops the typed keys from memory after a successful deploy so the next one reuses the stored secrets', async () => {
    const clearStagedStaticKeys = jest.fn();
    await runDeploy(
      makeParams({
        clearStagedStaticKeys,
        authenticateAndDeployStep: {
          staticKeys: { access_key_id: 'AKID', secret_access_key: 'SECRET' },
        },
      })
    );

    expect(clearStagedStaticKeys).toHaveBeenCalledTimes(1);
  });

  it('keeps the typed keys when a policy failed to deploy, so Retry can send them', async () => {
    mockDeployGroup.mockRejectedValue(new Error('boom'));
    const clearStagedStaticKeys = jest.fn();
    await runDeploy(
      makeParams({
        clearStagedStaticKeys,
        authenticateAndDeployStep: {
          staticKeys: { access_key_id: 'AKID', secret_access_key: 'SECRET' },
        },
      })
    );

    expect(clearStagedStaticKeys).not.toHaveBeenCalled();
  });

  it('does not look up kept secrets when both keys were typed; it reads back the ones it just stored', async () => {
    await runDeploy(
      makeParams({
        authenticateAndDeployStep: {
          staticKeys: { access_key_id: 'AKID', secret_access_key: 'SECRET' },
        },
      })
    );

    // No lookup on the deployed policy; the only read is of the policy the deploy just created.
    expect(mockFetchRefs).not.toHaveBeenCalledWith('policy-A');
    expect(mockFetchRefs).toHaveBeenCalledWith('policy-B');
    expect(mockDeployGroup.mock.calls[0][1].authenticateAndDeployStep.staticKeys).toStrictEqual({
      access_key_id: 'AKID',
      secret_access_key: 'SECRET',
    });
    expect(mockDeployGroup.mock.calls[0][1].authenticateAndDeployStep.existingSecretRefs).toBe(
      undefined
    );
  });

  describe('typed keys shared across policies', () => {
    const TYPED = { staticKeys: { access_key_id: 'AKID', secret_access_key: 'SECRET' } };

    it('stores typed keys once for new policies: the first gets them, the rest get its refs', async () => {
      mockFetchRefs.mockResolvedValue(FULL_REFS);
      mockDeployGroup
        .mockResolvedValueOnce({ policyId: 'new-1' })
        .mockResolvedValueOnce({ policyId: 'new-2' });
      await runDeploy(
        makeParams({
          deployGroups: [makeGroup('s3'), makeGroup('sqs')],
          serviceStatuses: {},
          policyIdsByInstance: {},
          pendingCleanupPolicyIds: {},
          authenticateAndDeployStep: TYPED,
        })
      );

      expect(mockFetchRefs).toHaveBeenCalledWith('new-1');
      const [first, second] = mockDeployGroup.mock.calls.map(([, opts]) => opts);
      expect(first.authenticateAndDeployStep.staticKeys).toStrictEqual(TYPED.staticKeys);
      expect(first.authenticateAndDeployStep.existingSecretRefs).toBeUndefined();
      // The refs cover both typed values, so none of them is sent again.
      expect(second.authenticateAndDeployStep.staticKeys).toStrictEqual({
        access_key_id: '',
        secret_access_key: '',
      });
      expect(second.authenticateAndDeployStep.existingSecretRefs).toBe(FULL_REFS);
    });

    it('a dirty update stores typed keys once; the other policies and new ones use that secret', async () => {
      mockFetchRefs.mockImplementation(async (id?: string) =>
        id === 'policy-A' ? FULL_REFS : new Map()
      );
      mockUpdate.mockResolvedValue(undefined);
      await runDeploy(
        makeParams({
          deployGroups: [makeGroup('elb'), makeGroup('alb'), makeGroup('s3')],
          serviceStatuses: { elb: 'receiving', alb: 'receiving' },
          policyIdsByInstance: { elb: 'policy-A', alb: 'policy-C' },
          pendingCleanupPolicyIds: {},
          isDirty: true,
          authenticateAndDeployStep: TYPED,
        })
      );

      const updates = mockUpdate.mock.calls.map(([policyId, , opts]) => ({
        policyId,
        auth: opts.authenticateAndDeployStep,
      }));
      expect(updates.map((u) => u.policyId)).toEqual(['policy-A', 'policy-C']);
      // First policy: typed keys. Second: the refs Fleet stored for the first, no typed keys.
      expect(updates[0].auth.staticKeys).toStrictEqual(TYPED.staticKeys);
      expect(updates[1].auth.staticKeys).toStrictEqual({
        access_key_id: '',
        secret_access_key: '',
      });
      expect(updates[1].auth.existingSecretRefs).toBe(FULL_REFS);
      // The service added in the same run is created on the same secret too.
      const created = mockDeployGroup.mock.calls[0][1].authenticateAndDeployStep;
      expect(created.staticKeys).toStrictEqual({ access_key_id: '', secret_access_key: '' });
      expect(created.existingSecretRefs).toBe(FULL_REFS);
    });

    it('keeps typed values for credentials the shared refs do not cover', async () => {
      // Only the secret access key is stored as a secret (KEPT_REFS), the access key id is not.
      mockDeployGroup
        .mockResolvedValueOnce({ policyId: 'new-1' })
        .mockResolvedValueOnce({ policyId: 'new-2' });
      await runDeploy(
        makeParams({
          deployGroups: [makeGroup('s3'), makeGroup('sqs')],
          serviceStatuses: {},
          policyIdsByInstance: {},
          pendingCleanupPolicyIds: {},
          authenticateAndDeployStep: TYPED,
        })
      );

      const second = mockDeployGroup.mock.calls[1][1].authenticateAndDeployStep;
      expect(second.staticKeys).toStrictEqual({ access_key_id: 'AKID', secret_access_key: '' });
      expect(second.existingSecretRefs).toBe(KEPT_REFS);
    });

    it.each([
      ['with typed keys', TYPED],
      ['without typed keys', {}],
    ])(
      'updates the deployed policies one at a time, so a replaced secret is never deleted under a policy still on it (%s)',
      async (_label, authenticateAndDeployStep) => {
        mockFetchRefs.mockImplementation(async () => FULL_REFS);
        const started: string[] = [];
        const releases: Array<() => void> = [];
        mockUpdate.mockImplementation(
          (policyId: string) =>
            new Promise<void>((resolve) => {
              started.push(policyId);
              releases.push(resolve);
            })
        );
        const finished = runDeploy(
          makeParams({
            deployGroups: [makeGroup('elb'), makeGroup('alb'), makeGroup('vpn')],
            serviceStatuses: { elb: 'receiving', alb: 'receiving', vpn: 'receiving' },
            policyIdsByInstance: { elb: 'policy-A', alb: 'policy-C', vpn: 'policy-D' },
            pendingCleanupPolicyIds: {},
            isDirty: true,
            authenticateAndDeployStep,
          })
        );

        // Each update starts only once the previous one has finished.
        for (let i = 0; i < 3; i++) {
          await waitFor(() => expect(started).toHaveLength(i + 1));
          await new Promise((r) => setImmediate(r));
          expect(started).toHaveLength(i + 1);
          releases[i]();
        }
        await finished;
        expect(started).toEqual(['policy-A', 'policy-C', 'policy-D']);
      }
    );

    it('cleanup of a surviving policy keeps the secret a dirty update just stored, so new policies can still use it', async () => {
      mockFetchRefs.mockImplementation(async (id?: string) =>
        id === 'policy-A' ? FULL_REFS : new Map()
      );
      mockUpdate.mockResolvedValue(undefined);
      mockCleanup.mockResolvedValue({
        toDelete: [],
        toUpdate: [{ policyId: 'policy-A', survivingInstanceIds: ['elb'] }],
      });
      await runDeploy(
        makeParams({
          deployGroups: [makeGroup('elb'), makeGroup('s3')],
          serviceStatuses: { elb: 'receiving' },
          policyIdsByInstance: { elb: 'policy-A', removed: 'policy-A' },
          pendingCleanupPolicyIds: { removed: 'policy-A' },
          isDirty: true,
          authenticateAndDeployStep: TYPED,
        })
      );

      // The dirty update stored the typed keys on policy-A once...
      expect(mockUpdate.mock.calls[0][2].authenticateAndDeployStep.staticKeys).toStrictEqual(
        TYPED.staticKeys
      );
      // ...cleanup then updates policy-A with that stored secret, not the typed keys again...
      const cleanupAuth = mockCleanup.mock.calls[0][0].authenticateAndDeployStep;
      expect(cleanupAuth.existingSecretRefs).toBe(FULL_REFS);
      expect(cleanupAuth.staticKeys).toStrictEqual({ access_key_id: '', secret_access_key: '' });
      // ...so the refs the new policy is created with are still the live ones.
      expect(mockDeployGroup.mock.calls[0][1].authenticateAndDeployStep.existingSecretRefs).toBe(
        FULL_REFS
      );
    });

    it('does not share anything for a single policy or without typed keys', async () => {
      await runDeploy(makeParams());
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockDeployGroup).toHaveBeenCalledTimes(1);
    });
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
