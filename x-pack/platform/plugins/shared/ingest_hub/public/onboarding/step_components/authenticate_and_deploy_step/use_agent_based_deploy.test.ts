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

jest.mock('./policy_cleanup_agent_based', () => ({
  cleanupAgentBasedPolicies: jest.fn(),
}));

import { useOnboardingFlow } from '../../onboarding_flow_context';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import {
  buildAgentBasedTargets,
  deployToExistingAgentPolicies,
  buildAgentBasedInstanceStatuses,
  extractErrorMessage,
} from './agent_based_deploy';
import { cleanupAgentBasedPolicies } from './policy_cleanup_agent_based';

import { useAgentBasedDeploy } from './use_agent_based_deploy';

const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;
const mockUseSessionStorage = useSessionStorage as jest.Mock;
const mockBuildAgentBasedTargets = buildAgentBasedTargets as jest.Mock;
const mockDeployToExistingAgentPolicies = deployToExistingAgentPolicies as jest.Mock;
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
    servicesStep: { selectedServiceIds: [] },
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

describe('useAgentBasedDeploy — incremental deploy filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSessionStorage.mockReturnValue([{ globalRegion: '', serviceVars: {} }, jest.fn()]);
    mockBuildAgentBasedInstanceStatuses.mockReturnValue({});
    mockExtractErrorMessage.mockReturnValue('error');
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
