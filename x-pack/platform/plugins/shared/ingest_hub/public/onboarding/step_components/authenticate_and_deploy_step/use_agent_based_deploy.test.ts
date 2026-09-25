/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

jest.mock('react-use/lib/useSessionStorage', () => jest.fn());

jest.mock('./agent_based_deploy', () => ({
  buildAgentBasedTargets: jest.fn(),
  deployNewAgentPolicy: jest.fn(),
  deployToExistingAgentPolicies: jest.fn(),
  buildAgentBasedInstanceStatuses: jest.fn(),
  extractErrorMessage: jest.fn(),
  buildAgentPolicyName: jest.fn(),
}));

jest.mock('./use_onboarding_so', () => ({
  useOnboardingSO: jest.fn(),
}));

jest.mock('./package_inputs', () => ({
  toSOServiceVars: jest.fn().mockReturnValue({}),
}));

jest.mock('./agent_based_section/credential_method_selector', () => ({
  toSOAuthMethod: jest.fn().mockReturnValue('static_keys'),
}));

jest.mock('./policy_cleanup_agent_based', () => ({
  cleanupAgentBasedPolicies: jest.fn(),
}));

import { useOnboardingFlow } from '../../onboarding_flow_context';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import {
  buildAgentBasedTargets,
  deployToExistingAgentPolicies,
  deployNewAgentPolicy,
  buildAgentBasedInstanceStatuses,
  extractErrorMessage,
} from './agent_based_deploy';
import { useOnboardingSO } from './use_onboarding_so';
import { cleanupAgentBasedPolicies } from './policy_cleanup_agent_based';

import { useAgentBasedDeploy } from './use_agent_based_deploy';

const mockUseOnboardingSO = useOnboardingSO as jest.Mock;

const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;
const mockUseSessionStorage = useSessionStorage as jest.Mock;
const mockBuildAgentBasedTargets = buildAgentBasedTargets as jest.Mock;
const mockDeployToExistingAgentPolicies = deployToExistingAgentPolicies as jest.Mock;
const mockDeployNewAgentPolicy = deployNewAgentPolicy as jest.Mock;
const mockBuildAgentBasedInstanceStatuses = buildAgentBasedInstanceStatuses as jest.Mock;
const mockExtractErrorMessage = extractErrorMessage as jest.Mock;
const mockCleanupAgentBasedPolicies = cleanupAgentBasedPolicies as jest.Mock;

// ── Helpers ───────────────────────────────────────────────────────────────────

const groupA = {
  groupId: 'aws',
  instanceIds: ['serviceA'],
  members: [],
  isDuplicateGroup: false,
};

const groupB = {
  groupId: 'aws-2',
  instanceIds: ['serviceB'],
  members: [],
  isDuplicateGroup: false,
};

function makeFlowMock({
  agentPolicyId = 'existing-policy-id',
  agentHostsMode = 'existing' as const,
  policyIdsByInstance = {} as Record<string, string>,
} = {}) {
  const updateDetectAndReviewStep = jest.fn();
  const removeDeployInstances = jest.fn();
  mockUseOnboardingFlow.mockReturnValue({
    servicesStep: { selectedServiceIds: [], dataFormat: 'ecs' as const },
    authenticateAndDeployStep: {},
    detectAndReviewStep: { policyIdsByInstance },
    updateDetectAndReviewStep,
    removeDeployInstances,
    getLatestFailedInstances: jest.fn().mockReturnValue([]),
    awsServicesMap: new Map(),
    agentBasedDeployment: {
      agentHostsMode,
      agentPolicyId,
      selectedAgentPolicyIds: [agentPolicyId],
    },
    setAgentBasedDeployment: jest.fn(),
  });
  return { updateDetectAndReviewStep, removeDeployInstances };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const mockCreateDeployment = jest.fn().mockResolvedValue(null);
const mockUpdateDeployment = jest.fn().mockResolvedValue(undefined);
const mockPersistDeploymentId = jest.fn();

describe('useAgentBasedDeploy — SO persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSessionStorage.mockReturnValue([{ globalRegion: '', serviceVars: {} }, jest.fn()]);
    mockBuildAgentBasedInstanceStatuses.mockReturnValue({});
    mockExtractErrorMessage.mockReturnValue('error');
    mockUseOnboardingSO.mockReturnValue({
      createDeployment: mockCreateDeployment,
      updateDeployment: mockUpdateDeployment,
      persistDeploymentId: mockPersistDeploymentId,
    });
  });

  it('creates SO on first deploy, persists id in URL, and updates with agentPolicyIds + status:succeeded', async () => {
    mockCreateDeployment.mockResolvedValue('so-id-123');
    makeFlowMock({ agentHostsMode: 'existing', policyIdsByInstance: {} });
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: { serviceA: 'pkg-A' },
      failedInstances: [],
      errorsByInstance: {},
    });

    const { result } = renderHook(() => useAgentBasedDeploy());
    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockCreateDeployment).toHaveBeenCalledTimes(1);
    expect(mockCreateDeployment).toHaveBeenCalledWith(
      expect.objectContaining({ mechanisms: ['agent_based'], provider: 'aws' })
    );
    expect(mockPersistDeploymentId).toHaveBeenCalledWith('so-id-123');
    expect(mockUpdateDeployment).toHaveBeenCalledWith(
      'so-id-123',
      expect.objectContaining({ status: 'succeeded' })
    );
  });

  it('update carries agentPolicyIds from existing-policy deploy', async () => {
    mockCreateDeployment.mockResolvedValue('so-id-456');
    makeFlowMock({
      agentHostsMode: 'existing',
      agentPolicyId: undefined as unknown as string,
      policyIdsByInstance: {},
    });
    // Override selectedAgentPolicyIds to have two policies.
    mockUseOnboardingFlow.mockReturnValue({
      ...mockUseOnboardingFlow.mock.results[0]?.value,
      servicesStep: { selectedServiceIds: [], dataFormat: 'ecs' as const },
      authenticateAndDeployStep: {},
      detectAndReviewStep: { policyIdsByInstance: {} },
      updateDetectAndReviewStep: jest.fn(),
      getLatestFailedInstances: jest.fn().mockReturnValue([]),
      awsServicesMap: new Map(),
      agentBasedDeployment: {
        agentHostsMode: 'existing' as const,
        agentPolicyId: undefined,
        selectedAgentPolicyIds: ['policy-1', 'policy-2'],
      },
      setAgentBasedDeployment: jest.fn(),
    });
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: { serviceA: 'pkg-A' },
      failedInstances: [],
      errorsByInstance: {},
    });

    const { result } = renderHook(() => useAgentBasedDeploy());
    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockUpdateDeployment).toHaveBeenCalledWith(
      'so-id-456',
      expect.objectContaining({ agentPolicyIds: ['policy-1', 'policy-2'], status: 'succeeded' })
    );
  });

  it('updates SO with status:failed when deploy has failures', async () => {
    mockCreateDeployment.mockResolvedValue('so-id-789');
    makeFlowMock({ agentHostsMode: 'existing', policyIdsByInstance: {} });
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: {},
      failedInstances: ['serviceA'],
      errorsByInstance: { serviceA: 'deploy error' },
    });

    const { result } = renderHook(() => useAgentBasedDeploy());
    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockUpdateDeployment).toHaveBeenCalledWith(
      'so-id-789',
      expect.objectContaining({ status: 'failed' })
    );
  });

  it('does not create a second SO on Back→Next re-entry (onboardingDeploymentId already set)', async () => {
    mockCreateDeployment.mockResolvedValue('so-id-new');
    makeFlowMock({ agentHostsMode: 'existing', policyIdsByInstance: {} });
    // Simulate an existing deployment id in session storage.
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: [], dataFormat: 'ecs' as const },
      authenticateAndDeployStep: {},
      detectAndReviewStep: { policyIdsByInstance: {}, onboardingDeploymentId: 'so-id-existing' },
      updateDetectAndReviewStep: jest.fn(),
      getLatestFailedInstances: jest.fn().mockReturnValue([]),
      awsServicesMap: new Map(),
      agentBasedDeployment: {
        agentHostsMode: 'existing' as const,
        agentPolicyId: 'existing-policy-id',
        selectedAgentPolicyIds: ['existing-policy-id'],
      },
      setAgentBasedDeployment: jest.fn(),
    });
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: { serviceA: 'pkg-A' },
      failedInstances: [],
      errorsByInstance: {},
    });

    const { result } = renderHook(() => useAgentBasedDeploy());
    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockCreateDeployment).not.toHaveBeenCalled();
    expect(mockPersistDeploymentId).not.toHaveBeenCalled();
    // Update still fires against the existing id.
    expect(mockUpdateDeployment).toHaveBeenCalledWith('so-id-existing', expect.any(Object));
  });

  it('does not create a second SO on retry', async () => {
    mockCreateDeployment.mockResolvedValue('so-id-retry');
    makeFlowMock({ agentHostsMode: 'existing', policyIdsByInstance: { serviceA: 'pkg-A' } });
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: {},
      failedInstances: [],
      errorsByInstance: {},
    });

    const { result } = renderHook(() => useAgentBasedDeploy());
    await act(async () => {
      // Retry call — isRetry is true, so SO create must be skipped.
      await result.current.handleDeploy(['serviceA']);
    });

    expect(mockCreateDeployment).not.toHaveBeenCalled();
    expect(mockPersistDeploymentId).not.toHaveBeenCalled();
  });

  it('continues deploy even when SO create fails (createDeployment returns null)', async () => {
    mockCreateDeployment.mockResolvedValue(null);
    makeFlowMock({ agentHostsMode: 'existing', policyIdsByInstance: {} });
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: { serviceA: 'pkg-A' },
      failedInstances: [],
      errorsByInstance: {},
    });

    const { result } = renderHook(() => useAgentBasedDeploy());
    let deployResult: { failed: boolean } | undefined;
    await act(async () => {
      deployResult = await result.current.handleDeploy();
    });

    expect(deployResult?.failed).toBe(false);
    expect(mockPersistDeploymentId).not.toHaveBeenCalled();
    // No SO id → updateDeployment must not be called.
    expect(mockUpdateDeployment).not.toHaveBeenCalled();
  });

  // services/serviceVars refresh on success-path update
  it('success-path update includes services and serviceVars so SO stays current after incremental additions', async () => {
    mockCreateDeployment.mockResolvedValue('so-id-refresh');
    // Simulate: service A already deployed, now deploying service A+B (B is new).
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['serviceA', 'serviceB'], dataFormat: 'ecs' as const },
      authenticateAndDeployStep: {},
      detectAndReviewStep: {
        policyIdsByInstance: { serviceA: 'pkg-A' },
        onboardingDeploymentId: 'so-id-refresh',
        pendingCleanupPolicyIds: {},
      },
      updateDetectAndReviewStep: jest.fn(),
      removeDeployInstances: jest.fn(),
      getLatestFailedInstances: jest.fn().mockReturnValue([]),
      awsServicesMap: new Map(),
      agentBasedDeployment: {
        agentHostsMode: 'existing' as const,
        agentPolicyId: 'existing-policy-id',
        selectedAgentPolicyIds: ['existing-policy-id'],
      },
      setAgentBasedDeployment: jest.fn(),
    });
    // targets = both A and B; the hook filters to only B since A is already in policyIdsByInstance
    mockBuildAgentBasedTargets.mockReturnValue([groupA, groupB]);
    mockCleanupAgentBasedPolicies.mockResolvedValue({ removedPolicyIds: [] });
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: { serviceB: 'pkg-B' },
      failedInstances: [],
      errorsByInstance: {},
    });

    const { result } = renderHook(() => useAgentBasedDeploy());
    await act(async () => {
      await result.current.handleDeploy();
    });

    // The update must carry the FULL service list, not just the newly deployed one.
    expect(mockUpdateDeployment).toHaveBeenCalledWith(
      'so-id-refresh',
      expect.objectContaining({
        services: ['serviceA', 'serviceB'],
        serviceVars: expect.any(Object),
        status: 'succeeded',
      })
    );
  });

  // catch-path update includes services/serviceVars/authMethod so a resumed-after-error
  // deployment restores the correct service set and credential method.
  it('catch-path update includes services, serviceVars, and authMethod so resume after unexpected error is consistent', async () => {
    mockCreateDeployment.mockResolvedValue(null);
    // Set up with a pre-existing SO id so the catch update fires.
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['serviceA'], dataFormat: 'ecs' as const },
      authenticateAndDeployStep: {},
      detectAndReviewStep: {
        policyIdsByInstance: {},
        onboardingDeploymentId: 'so-id-catch',
      },
      updateDetectAndReviewStep: jest.fn(),
      getLatestFailedInstances: jest.fn().mockReturnValue([]),
      awsServicesMap: new Map(),
      agentBasedDeployment: {
        agentHostsMode: 'existing' as const,
        agentPolicyId: 'existing-policy-id',
        selectedAgentPolicyIds: ['existing-policy-id'],
      },
      setAgentBasedDeployment: jest.fn(),
    });
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);
    // Make the deploy function throw to exercise the catch block.
    mockDeployToExistingAgentPolicies.mockRejectedValue(new Error('unexpected network failure'));

    const { result } = renderHook(() => useAgentBasedDeploy());
    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockUpdateDeployment).toHaveBeenCalledTimes(1);
    const [, payload] = mockUpdateDeployment.mock.calls[0];
    expect(payload).toHaveProperty('status', 'failed');
    // Catch path must carry services/serviceVars/authMethod so resume after an unexpected error
    // restores the correct service set and credential method rather than a stale snapshot.
    expect(payload).toHaveProperty('services', ['serviceA']);
    expect(payload).toHaveProperty('serviceVars');
    expect(payload).toHaveProperty('authMethod');
  });

  it('create payload includes agentPolicyIds for existing-policy mode so mid-deploy tab-close leaves a resumable record', async () => {
    mockCreateDeployment.mockResolvedValue('so-id-existing-create');
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['serviceA'], dataFormat: 'ecs' as const },
      authenticateAndDeployStep: {},
      detectAndReviewStep: { policyIdsByInstance: {} },
      updateDetectAndReviewStep: jest.fn(),
      getLatestFailedInstances: jest.fn().mockReturnValue([]),
      awsServicesMap: new Map(),
      agentBasedDeployment: {
        agentHostsMode: 'existing' as const,
        agentPolicyId: undefined,
        selectedAgentPolicyIds: ['policy-x', 'policy-y'],
      },
      setAgentBasedDeployment: jest.fn(),
    });
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: { serviceA: 'pkg-A' },
      failedInstances: [],
      errorsByInstance: {},
    });

    const { result } = renderHook(() => useAgentBasedDeploy());
    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockCreateDeployment).toHaveBeenCalledWith(
      expect.objectContaining({ agentPolicyIds: ['policy-x', 'policy-y'] })
    );
  });

  it('create payload includes agentPolicyIds for pre-created new-policy mode so mid-deploy tab-close hydrates back into existing mode', async () => {
    mockCreateDeployment.mockResolvedValue('so-id-precreated');
    // agentHostsMode is 'new' but agentPolicyId is already set (flyout created it on a prior Next).
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['serviceA'], dataFormat: 'ecs' as const },
      authenticateAndDeployStep: {},
      detectAndReviewStep: { policyIdsByInstance: {} },
      updateDetectAndReviewStep: jest.fn(),
      getLatestFailedInstances: jest.fn().mockReturnValue([]),
      awsServicesMap: new Map(),
      agentBasedDeployment: {
        agentHostsMode: 'new' as const,
        agentPolicyId: 'pre-created-policy-id',
        selectedAgentPolicyIds: [],
      },
      setAgentBasedDeployment: jest.fn(),
    });
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);
    mockDeployNewAgentPolicy.mockResolvedValue({
      packagePolicyIdsByInstance: { serviceA: 'pkg-A' },
      failedInstances: [],
      errorsByInstance: {},
      agentPolicyId: 'pre-created-policy-id',
      agentPolicyName: 'AWS Agent Policy 1',
    });

    const { result } = renderHook(() => useAgentBasedDeploy());
    await act(async () => {
      await result.current.handleDeploy();
    });

    // The create payload must include agentPolicyIds wrapping the pre-created id so a
    // mid-deploy tab-close hydrates as existing mode, not new-policy mode.
    expect(mockCreateDeployment).toHaveBeenCalledWith(
      expect.objectContaining({ agentPolicyIds: ['pre-created-policy-id'] })
    );
  });

  it('partial retry status uses merged failure set, not just current-call failures', async () => {
    mockCreateDeployment.mockResolvedValue(null);
    makeFlowMock({ agentHostsMode: 'existing', policyIdsByInstance: { serviceA: 'pkg-A' } });
    // Set up flow with onboardingDeploymentId so the update fires.
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: [], dataFormat: 'ecs' as const },
      authenticateAndDeployStep: {},
      detectAndReviewStep: {
        policyIdsByInstance: { serviceA: 'pkg-A' },
        onboardingDeploymentId: 'so-id-partial',
      },
      updateDetectAndReviewStep: jest.fn(),
      // serviceB was a prior failure and is NOT being retried.
      getLatestFailedInstances: jest.fn().mockReturnValue(['serviceB']),
      awsServicesMap: new Map(),
      agentBasedDeployment: {
        agentHostsMode: 'existing' as const,
        agentPolicyId: 'existing-policy-id',
        selectedAgentPolicyIds: ['existing-policy-id'],
      },
      setAgentBasedDeployment: jest.fn(),
    });
    mockBuildAgentBasedTargets.mockReturnValue([groupA, groupB]);
    // Retry only serviceA — it succeeds.
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: { serviceA: 'pkg-A' },
      failedInstances: [],
      errorsByInstance: {},
    });

    const { result } = renderHook(() => useAgentBasedDeploy());
    await act(async () => {
      await result.current.handleDeploy(['serviceA']);
    });

    // serviceB is still failed from before → merged status must be 'failed', not 'succeeded'.
    expect(mockUpdateDeployment).toHaveBeenCalledWith(
      'so-id-partial',
      expect.objectContaining({ status: 'failed' })
    );
  });
});

describe('useAgentBasedDeploy — incremental deploy filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSessionStorage.mockReturnValue([{ globalRegion: '', serviceVars: {} }, jest.fn()]);
    mockBuildAgentBasedInstanceStatuses.mockReturnValue({});
    mockExtractErrorMessage.mockReturnValue('error');
    mockUseOnboardingSO.mockReturnValue({
      createDeployment: mockCreateDeployment,
      updateDeployment: mockUpdateDeployment,
      persistDeploymentId: mockPersistDeploymentId,
    });
  });

  it('skips already-deployed instances and only deploys new ones (A deployed, B added → only B deployed)', async () => {
    // serviceA was deployed in a previous Next click and its policy id is persisted.
    // serviceB is new. handleDeploy (non-retry) should only deploy groupB.
    makeFlowMock({ policyIdsByInstance: { serviceA: 'pkg-policy-A' } });

    // Both groups appear in targets (the hook sees all current targets).
    mockBuildAgentBasedTargets.mockReturnValue([groupA, groupB]);
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: { serviceB: 'pkg-policy-B' },
      failedInstances: [],
      errorsByInstance: {},
    });

    const { result } = renderHook(() => useAgentBasedDeploy());

    await act(async () => {
      await result.current.handleDeploy();
    });

    // deployToExistingAgentPolicies must have been called with only groupB.
    expect(mockDeployToExistingAgentPolicies).toHaveBeenCalledTimes(1);
    const [calledGroups] = mockDeployToExistingAgentPolicies.mock.calls[0];
    expect(calledGroups).toHaveLength(1);
    expect(calledGroups[0].instanceIds).toEqual(['serviceB']);
  });

  it('deploys all groups when none are already deployed', async () => {
    makeFlowMock({ policyIdsByInstance: {} });
    mockBuildAgentBasedTargets.mockReturnValue([groupA, groupB]);
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: { serviceA: 'pkg-policy-A', serviceB: 'pkg-policy-B' },
      failedInstances: [],
      errorsByInstance: {},
    });

    const { result } = renderHook(() => useAgentBasedDeploy());

    await act(async () => {
      await result.current.handleDeploy();
    });

    const [calledGroups] = mockDeployToExistingAgentPolicies.mock.calls[0];
    expect(calledGroups).toHaveLength(2);
  });

  it('retry path is unaffected — retries only the specified failed instances regardless of policyIdsByInstance', async () => {
    // serviceA is in policyIdsByInstance (previously succeeded) but is being retried.
    makeFlowMock({ policyIdsByInstance: { serviceA: 'pkg-policy-A' } });
    mockBuildAgentBasedTargets.mockReturnValue([groupA, groupB]);
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: {},
      failedInstances: ['serviceA'],
      errorsByInstance: { serviceA: 'timeout' },
    });

    const { result } = renderHook(() => useAgentBasedDeploy());

    await act(async () => {
      // Explicitly retry serviceA even though it's in policyIdsByInstance.
      await result.current.handleDeploy(['serviceA']);
    });

    const [calledGroups] = mockDeployToExistingAgentPolicies.mock.calls[0];
    expect(calledGroups).toHaveLength(1);
    expect(calledGroups[0].instanceIds).toEqual(['serviceA']);
  });
});

// ─── useAgentBasedDeploy — isAlreadyDeployed ────────────────────────────────

describe('useAgentBasedDeploy — isAlreadyDeployed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSessionStorage.mockReturnValue([{ globalRegion: '', serviceVars: {} }, jest.fn()]);
    mockBuildAgentBasedInstanceStatuses.mockReturnValue({});
  });

  it('is true when all targets have policy IDs and no cleanup is pending (Back+Next should short-circuit)', () => {
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: [] },
      authenticateAndDeployStep: {},
      detectAndReviewStep: {
        policyIdsByInstance: { serviceA: 'pkg-policy-A' },
        pendingCleanupPolicyIds: {},
      },
      updateDetectAndReviewStep: jest.fn(),
      removeDeployInstances: jest.fn(),
      getLatestFailedInstances: jest.fn().mockReturnValue([]),
      awsServicesMap: new Map(),
      agentBasedDeployment: {
        agentHostsMode: 'existing' as const,
        agentPolicyId: 'ap-1',
        selectedAgentPolicyIds: ['ap-1'],
      },
      setAgentBasedDeployment: jest.fn(),
    });
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);

    const { result } = renderHook(() => useAgentBasedDeploy());
    expect(result.current.isAlreadyDeployed).toBe(true);
  });

  it('is false when live-stale entries exist (bug: cleanup-needed case must not short-circuit)', () => {
    // serviceA and removed-svc share a policy. removed-svc was deselected from Step 1.
    // policyIdsByInstance still has removed-svc (live-stale). isAlreadyDeployed must be false
    // so handleNext runs handleDeploy, which updates the shared policy to drop removed-svc inputs.
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: [] },
      authenticateAndDeployStep: {},
      detectAndReviewStep: {
        policyIdsByInstance: { serviceA: 'pkg-policy-shared', 'removed-svc': 'pkg-policy-shared' },
        pendingCleanupPolicyIds: {},
      },
      updateDetectAndReviewStep: jest.fn(),
      removeDeployInstances: jest.fn(),
      getLatestFailedInstances: jest.fn().mockReturnValue([]),
      awsServicesMap: new Map(),
      agentBasedDeployment: {
        agentHostsMode: 'existing' as const,
        agentPolicyId: 'ap-1',
        selectedAgentPolicyIds: ['ap-1'],
      },
      setAgentBasedDeployment: jest.fn(),
    });
    // Only serviceA is in active targets — removed-svc was deselected.
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);

    const { result } = renderHook(() => useAgentBasedDeploy());
    expect(result.current.isAlreadyDeployed).toBe(false);
  });

  it('is false when pendingCleanupPolicyIds is non-empty (explicit Step 4 deselection must not short-circuit)', () => {
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: [] },
      authenticateAndDeployStep: {},
      detectAndReviewStep: {
        policyIdsByInstance: { serviceA: 'pkg-policy-A' },
        pendingCleanupPolicyIds: { 'removed-svc': 'pkg-policy-removed' },
      },
      updateDetectAndReviewStep: jest.fn(),
      removeDeployInstances: jest.fn(),
      getLatestFailedInstances: jest.fn().mockReturnValue([]),
      awsServicesMap: new Map(),
      agentBasedDeployment: {
        agentHostsMode: 'existing' as const,
        agentPolicyId: 'ap-1',
        selectedAgentPolicyIds: ['ap-1'],
      },
      setAgentBasedDeployment: jest.fn(),
    });
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);

    const { result } = renderHook(() => useAgentBasedDeploy());
    expect(result.current.isAlreadyDeployed).toBe(false);
  });
});

// ─── useAgentBasedDeploy — cleanup orchestration ────────────────────────────

describe('useAgentBasedDeploy — cleanup orchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCleanupAgentBasedPolicies.mockResolvedValue({ toDelete: [], toUpdate: [] });
    mockBuildAgentBasedInstanceStatuses.mockReturnValue({});
    mockExtractErrorMessage.mockReturnValue('error');
  });

  it('calls cleanupAgentBasedPolicies and clears pendingCleanupPolicyIds when cleanup succeeds', async () => {
    // Simulate successful delete so the pending entry is cleared.
    mockCleanupAgentBasedPolicies.mockResolvedValue({ toDelete: ['pkg-policy-A'], toUpdate: [] });
    const updateDetectAndReviewStep = jest.fn();
    const removeDeployInstances = jest.fn();
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: [] },
      authenticateAndDeployStep: {},
      detectAndReviewStep: {
        policyIdsByInstance: {},
        pendingCleanupPolicyIds: { instA: 'pkg-policy-A' },
      },
      updateDetectAndReviewStep,
      removeDeployInstances,
      getLatestFailedInstances: jest.fn().mockReturnValue([]),
      awsServicesMap: new Map(),
      agentBasedDeployment: {
        agentHostsMode: 'existing' as const,
        agentPolicyId: 'agent-policy-1',
        selectedAgentPolicyIds: ['agent-policy-1'],
      },
      setAgentBasedDeployment: jest.fn(),
    });
    mockUseSessionStorage.mockReturnValue([{ globalRegion: '', serviceVars: {} }, jest.fn()]);
    mockBuildAgentBasedTargets.mockReturnValue([]);

    const { result } = renderHook(() => useAgentBasedDeploy());

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockCleanupAgentBasedPolicies).toHaveBeenCalledTimes(1);
    const cleanupCall = mockCleanupAgentBasedPolicies.mock.calls[0][0];
    expect(cleanupCall.pendingCleanupPolicyIds).toEqual({ instA: 'pkg-policy-A' });
    expect(cleanupCall.selectedAgentPolicyIds).toEqual(['agent-policy-1']);
    // Verify agentCredentials are passed through to cleanup opts.
    expect(cleanupCall).toHaveProperty('agentCredentials');

    // pkg-policy-A succeeded → instA's pending entry is cleared.
    expect(updateDetectAndReviewStep).toHaveBeenCalledWith(
      expect.objectContaining({ pendingCleanupPolicyIds: {} })
    );
  });

  it('cleanup-only path: returns { failed: false } without deploying when no new targets', async () => {
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: [] },
      authenticateAndDeployStep: {},
      detectAndReviewStep: {
        policyIdsByInstance: {},
        pendingCleanupPolicyIds: { instA: 'pkg-policy-A' },
      },
      updateDetectAndReviewStep: jest.fn(),
      removeDeployInstances: jest.fn(),
      getLatestFailedInstances: jest.fn().mockReturnValue([]),
      awsServicesMap: new Map(),
      agentBasedDeployment: {
        agentHostsMode: 'existing' as const,
        agentPolicyId: 'agent-policy-1',
        selectedAgentPolicyIds: ['agent-policy-1'],
      },
      setAgentBasedDeployment: jest.fn(),
    });
    mockUseSessionStorage.mockReturnValue([{ globalRegion: '', serviceVars: {} }, jest.fn()]);
    mockBuildAgentBasedTargets.mockReturnValue([]);

    const { result } = renderHook(() => useAgentBasedDeploy());

    let deployResult: { failed: boolean } | undefined;
    await act(async () => {
      deployResult = await result.current.handleDeploy();
    });

    expect(deployResult).toEqual({ failed: false });
    expect(mockDeployToExistingAgentPolicies).not.toHaveBeenCalled();
    expect(mockCleanupAgentBasedPolicies).toHaveBeenCalledTimes(1);
  });

  it('runs cleanup on retry when pendingCleanupPolicyIds is non-empty', async () => {
    // A retry must still process pending cleanup — skipping it only when cleanup was successfully
    // cleared. If cleanup failed on the initial attempt and a target also failed, retrying the
    // target should not leave the old package policy in Fleet.
    mockCleanupAgentBasedPolicies.mockResolvedValue({ toDelete: ['pkg-policy-X'], toUpdate: [] });
    const updateDetectAndReviewStep = jest.fn();
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: [] },
      authenticateAndDeployStep: {},
      detectAndReviewStep: {
        policyIdsByInstance: { serviceA: 'pkg-policy-A' },
        pendingCleanupPolicyIds: { instX: 'pkg-policy-X' },
      },
      updateDetectAndReviewStep,
      removeDeployInstances: jest.fn(),
      getLatestFailedInstances: jest.fn().mockReturnValue(['serviceA']),
      awsServicesMap: new Map(),
      agentBasedDeployment: {
        agentHostsMode: 'existing' as const,
        agentPolicyId: 'agent-policy-1',
        selectedAgentPolicyIds: ['agent-policy-1'],
      },
      setAgentBasedDeployment: jest.fn(),
    });
    mockUseSessionStorage.mockReturnValue([{ globalRegion: '', serviceVars: {} }, jest.fn()]);
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: { serviceA: 'pkg-policy-A' },
      failedInstances: [],
      errorsByInstance: {},
    });

    const { result } = renderHook(() => useAgentBasedDeploy());

    await act(async () => {
      await result.current.handleDeploy(['serviceA']);
    });

    expect(mockCleanupAgentBasedPolicies).toHaveBeenCalledTimes(1);
    // pkg-policy-X succeeded → pending entry is cleared.
    expect(updateDetectAndReviewStep).toHaveBeenCalledWith(
      expect.objectContaining({ pendingCleanupPolicyIds: {} })
    );
  });

  it('skips cleanup when pendingCleanupPolicyIds is empty', async () => {
    makeFlowMock({ policyIdsByInstance: {} });
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: { serviceA: 'pkg-policy-A' },
      failedInstances: [],
      errorsByInstance: {},
    });

    const { result } = renderHook(() => useAgentBasedDeploy());

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockCleanupAgentBasedPolicies).not.toHaveBeenCalled();
  });

  it('triggers cleanup for services deselected from Step 1 (policyIdsByInstance has stale entry not in targets)', async () => {
    // 'old-svc' was deployed previously (policyIdsByInstance has it) but was deselected from
    // Step 1 without going through removeDeployInstance, so pendingCleanupPolicyIds is empty.
    // buildAgentBasedTargets returns only groupA (serviceA = currently selected) — old-svc is absent.
    // Live-stale detection should find old-svc and trigger cleanupAgentBasedPolicies + removeDeployInstances.
    // Simulate successful delete of old-svc's policy so it gets pruned.
    mockCleanupAgentBasedPolicies.mockResolvedValue({ toDelete: ['pkg-policy-OLD'], toUpdate: [] });
    const updateDetectAndReviewStep = jest.fn();
    const removeDeployInstances = jest.fn();
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: [] },
      authenticateAndDeployStep: {},
      detectAndReviewStep: {
        policyIdsByInstance: { serviceA: 'pkg-policy-A', 'old-svc': 'pkg-policy-OLD' },
        pendingCleanupPolicyIds: {},
      },
      updateDetectAndReviewStep,
      removeDeployInstances,
      getLatestFailedInstances: jest.fn().mockReturnValue([]),
      awsServicesMap: new Map(),
      agentBasedDeployment: {
        agentHostsMode: 'existing' as const,
        agentPolicyId: 'agent-policy-1',
        selectedAgentPolicyIds: ['agent-policy-1'],
      },
      setAgentBasedDeployment: jest.fn(),
    });
    mockUseSessionStorage.mockReturnValue([{ globalRegion: '', serviceVars: {} }, jest.fn()]);
    // targets only contains serviceA — old-svc has been deselected from Step 1.
    mockBuildAgentBasedTargets.mockReturnValue([groupA]);
    // serviceA is already deployed, so targetsToDeploy is empty; this is a cleanup-only run.
    mockDeployToExistingAgentPolicies.mockResolvedValue({
      packagePolicyIdsByInstance: {},
      failedInstances: [],
      errorsByInstance: {},
    });

    const { result } = renderHook(() => useAgentBasedDeploy());

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockCleanupAgentBasedPolicies).toHaveBeenCalledTimes(1);
    const cleanupCall = mockCleanupAgentBasedPolicies.mock.calls[0][0];
    expect(cleanupCall.pendingCleanupPolicyIds).toEqual({ 'old-svc': 'pkg-policy-OLD' });

    // pkg-policy-OLD succeeded → old-svc instance pruned from policyIdsByInstance.
    expect(removeDeployInstances).toHaveBeenCalledWith(['old-svc']);
    expect(updateDetectAndReviewStep).toHaveBeenCalledWith(
      expect.objectContaining({ pendingCleanupPolicyIds: {} })
    );
  });
});
