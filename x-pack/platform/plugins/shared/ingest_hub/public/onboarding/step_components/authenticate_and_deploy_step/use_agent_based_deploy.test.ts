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

import { useOnboardingFlow } from '../../onboarding_flow_context';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import {
  buildAgentBasedTargets,
  deployToExistingAgentPolicies,
  buildAgentBasedInstanceStatuses,
  extractErrorMessage,
} from './agent_based_deploy';
import { useOnboardingSO } from './use_onboarding_so';

import { useAgentBasedDeploy } from './use_agent_based_deploy';

const mockUseOnboardingSO = useOnboardingSO as jest.Mock;

const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;
const mockUseSessionStorage = useSessionStorage as jest.Mock;
const mockBuildAgentBasedTargets = buildAgentBasedTargets as jest.Mock;
const mockDeployToExistingAgentPolicies = deployToExistingAgentPolicies as jest.Mock;
const mockBuildAgentBasedInstanceStatuses = buildAgentBasedInstanceStatuses as jest.Mock;
const mockExtractErrorMessage = extractErrorMessage as jest.Mock;

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
  mockUseOnboardingFlow.mockReturnValue({
    servicesStep: { selectedServiceIds: [], dataFormat: 'ecs' as const },
    authenticateAndDeployStep: {},
    detectAndReviewStep: { policyIdsByInstance },
    updateDetectAndReviewStep,
    getLatestFailedInstances: jest.fn().mockReturnValue([]),
    awsServicesMap: new Map(),
    agentBasedDeployment: {
      agentHostsMode,
      agentPolicyId,
      selectedAgentPolicyIds: [agentPolicyId],
    },
    setAgentBasedDeployment: jest.fn(),
  });
  return { updateDetectAndReviewStep };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const mockCreateDeployment = jest.fn().mockResolvedValue(null);
const mockUpdateDeployment = jest.fn().mockResolvedValue(undefined);
const mockPersistDeploymentId = jest.fn();

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
