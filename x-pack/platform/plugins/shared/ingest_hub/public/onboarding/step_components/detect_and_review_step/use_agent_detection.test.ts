/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

jest.mock('../../onboarding_flow_context', () => ({ useOnboardingFlow: jest.fn() }));
jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('@kbn/fleet-plugin/public', () => ({
  getComponentAlertLevel: jest.fn(),
  getPackagePolicyUnitSummary: jest.fn(),
  sendGetAgentIncomingData: jest.fn(),
  useAgentsForPolicyIds: jest.fn(),
  useBulkGetAgentPoliciesQuery: jest.fn(),
}));

import { useQuery } from '@kbn/react-query';
import {
  getComponentAlertLevel,
  getPackagePolicyUnitSummary,
  sendGetAgentIncomingData,
  useAgentsForPolicyIds,
  useBulkGetAgentPoliciesQuery,
} from '@kbn/fleet-plugin/public';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { NOT_RUNNING_GRACE_MS, OTEL_NOT_RUNNING_GRACE_MS } from './agent_detection';
import { useAgentDetection } from './use_agent_detection';

const mockUseQuery = useQuery as jest.Mock;
const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;
const mockGetComponentAlertLevel = getComponentAlertLevel as jest.Mock;
const mockGetUnitSummary = getPackagePolicyUnitSummary as jest.Mock;
const mockSendIncomingData = sendGetAgentIncomingData as jest.Mock;
const mockUseBulkPolicies = useBulkGetAgentPoliciesQuery as jest.Mock;
const mockUsePolicyAgents = useAgentsForPolicyIds as jest.Mock;

const entry = (id: string, overrides: Record<string, unknown> = {}) =>
  ({ id, packageName: 'aws', ...overrides } as unknown as AwsServiceMatrixEntry);

const packagePolicy = (id: string, packageName = 'aws', version = '4.0.0') => ({
  id,
  package: { name: packageName, version },
});

const agentPolicy = (
  id: string,
  packagePolicies: unknown[],
  extra: Record<string, unknown> = {}
) => ({
  id,
  package_policies: packagePolicies,
  ...extra,
});

const agent = (id: string, status: string, policyId: string, extra = {}) => ({
  id,
  status,
  policy_id: policyId,
  ...extra,
});

const versioned = (version: string, extra: Record<string, unknown> = {}) =>
  agent('a1', 'online', 'policy-s3', {
    policy_revision: 3,
    local_metadata: { elastic: { agent: { version } } },
    components: [{ id: 'system-metrics' }],
    ...extra,
  });
const policyNeeding94 = agentPolicy('policy-s3', [packagePolicy('policy-s3')], {
  revision: 3,
  supports_agentless: true,
  min_agent_version: '9.4.0',
  package_agent_version_conditions: [{ name: 'aws', title: 'AWS', version_condition: '>=9.4.0' }],
});

interface SetupOptions {
  deploymentMethod?: 'managed_integration' | 'agent_based' | 'ecf';
  policyIdsByInstance?: Record<string, string>;
  agentBasedDeployment?: Record<string, unknown>;
  agentPolicies?: unknown[];
  agents?: unknown[];
  awsServicesMap?: Map<string, AwsServiceMatrixEntry>;
  instances?: Array<{ instanceId: string; serviceId: string }>;
  shouldPoll?: boolean;
  incomingData?: Record<string, string[]>;
  /** When the agents were last fetched, in ms. Drives the not-running grace period. */
  dataUpdatedAt?: number;
  /** Whether the agent list was capped, so some agents are missing from it. */
  isTruncated?: boolean;
}

const T0 = 1_000_000;

function setup({
  deploymentMethod = 'managed_integration',
  policyIdsByInstance = { s3: 'policy-s3' },
  agentBasedDeployment = { agentHostsMode: 'new', selectedAgentPolicyIds: [] },
  agentPolicies = [agentPolicy('policy-s3', [packagePolicy('policy-s3')])],
  agents = [agent('a1', 'online', 'policy-s3')],
  awsServicesMap = new Map([['s3', entry('s3')]]),
  instances = [{ instanceId: 's3', serviceId: 's3' }],
  shouldPoll = true,
  incomingData,
  dataUpdatedAt = T0,
  isTruncated = false,
}: SetupOptions = {}) {
  mockUseOnboardingFlow.mockReturnValue({
    detectAndReviewStep: { policyIdsByInstance },
    awsServicesMap,
    deploymentMethod,
    agentBasedDeployment,
  });
  mockUseBulkPolicies.mockReturnValue({ data: { items: agentPolicies } });
  mockUsePolicyAgents.mockReturnValue({ agents, dataUpdatedAt, isTruncated });
  mockUseQuery.mockReturnValue({ data: incomingData });
  const hook = renderHook(() => useAgentDetection({ instances, shouldPoll }));
  /** Simulates the next poll finishing `ms` after the first one, with the same agents. */
  const pollAfter = (ms: number) => {
    mockUsePolicyAgents.mockReturnValue({ agents, dataUpdatedAt: T0 + ms, isTruncated });
    hook.rerender();
  };
  return { ...hook, pollAfter };
}

describe('useAgentDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetComponentAlertLevel.mockReturnValue(null);
    mockGetUnitSummary.mockReturnValue({ total: 3, stopped: 0 });
  });

  describe('which agents are resolved', () => {
    it('does nothing for instances without a Fleet policy (ECF)', () => {
      const { result } = setup({ deploymentMethod: 'ecf', policyIdsByInstance: {} });

      expect(result.current.summaryByInstanceId).toEqual({});
      expect(mockUseBulkPolicies).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ enabled: false })
      );
      expect(mockUsePolicyAgents).toHaveBeenCalledWith([], { refetchInterval: 10_000 });
      expect(mockUseQuery.mock.calls[0][0].enabled).toBe(false);
    });

    it('resolves a managed integration through its agentless policy id', () => {
      setup();

      expect(mockUseBulkPolicies).toHaveBeenCalledWith(
        ['policy-s3'],
        expect.objectContaining({ full: true, enabled: true })
      );
      expect(mockUsePolicyAgents).toHaveBeenCalledWith(['policy-s3'], {
        refetchInterval: 10_000,
      });
    });

    it('resolves agent-based instances through the agent policy, not the package policy id', () => {
      setup({
        deploymentMethod: 'agent_based',
        policyIdsByInstance: { s3: 'package-policy-s3' },
        agentBasedDeployment: { agentHostsMode: 'new', agentPolicyId: 'agent-policy-1' },
        agentPolicies: [agentPolicy('agent-policy-1', [packagePolicy('package-policy-s3')])],
        agents: [agent('a1', 'online', 'agent-policy-1')],
      });

      expect(mockUseBulkPolicies.mock.calls[0][0]).toEqual(['agent-policy-1']);
      expect(mockUsePolicyAgents.mock.calls[0][0]).toEqual(['agent-policy-1']);
    });

    it('resolves agent-based instances through every selected existing policy', () => {
      setup({
        deploymentMethod: 'agent_based',
        policyIdsByInstance: { s3: 'package-policy-s3' },
        agentBasedDeployment: {
          agentHostsMode: 'existing',
          selectedAgentPolicyIds: ['ap-2', 'ap-1'],
        },
        agentPolicies: [],
        agents: [],
      });

      expect(mockUseBulkPolicies.mock.calls[0][0]).toEqual(['ap-1', 'ap-2']);
    });

    it('only counts running agents attached to the instance policies', () => {
      const { result } = setup({
        agents: [
          agent('mine', 'online', 'policy-s3'),
          agent('retired', 'inactive', 'policy-s3'),
          agent('gone', 'unenrolled', 'policy-s3'),
          agent('elsewhere', 'online', 'some-other-policy'),
        ],
      });

      expect(result.current.summaryByInstanceId.s3.agentIds).toEqual(['mine']);
    });

    it('treats a not-yet-created agent as pending', () => {
      const { result } = setup({ agents: [] });

      expect(result.current.summaryByInstanceId.s3).toMatchObject({
        health: 'pending',
        agentIds: [],
      });
    });
  });

  describe('agent health', () => {
    it('is healthy for an online agent whose integration units are fine', () => {
      const { result } = setup();

      expect(result.current.summaryByInstanceId.s3.health).toBe('healthy');
    });

    it('is unhealthy when the deployed package policy has failed units', () => {
      mockGetComponentAlertLevel.mockReturnValue('failed');
      const { result } = setup();

      expect(result.current.summaryByInstanceId.s3.health).toBe('unhealthy');
      expect(mockGetComponentAlertLevel).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'a1' }),
        expect.objectContaining({ id: 'policy-s3' })
      );
    });

    it('ignores an agent failure caused by a different integration on the same agent', () => {
      const { result } = setup({
        agents: [agent('a1', 'error', 'policy-s3', { components: [{ id: 'system' }] })],
      });

      expect(result.current.summaryByInstanceId.s3.health).toBe('healthy');
    });

    it('trusts the agent status when the package policy cannot be found to scope by', () => {
      const { result } = setup({
        agentPolicies: [],
        agents: [agent('a1', 'error', 'policy-s3', { components: [{ id: 'system' }] })],
      });

      expect(result.current.summaryByInstanceId.s3.health).toBe('unhealthy');
    });

    it('exposes the policies for the status flyout', () => {
      const policy = agentPolicy('policy-s3', [packagePolicy('policy-s3')]);
      const { result } = setup({ agentPolicies: [policy] });

      expect(result.current.agentPolicyByInstanceId.s3).toBe(policy);
      expect(result.current.packagePolicyByInstanceId.s3).toEqual(packagePolicy('policy-s3'));
    });

    it('finds the instance package policy among several on a shared agent policy', () => {
      const { result } = setup({
        deploymentMethod: 'agent_based',
        policyIdsByInstance: { s3: 'pp-s3', ec2: 'pp-ec2' },
        agentBasedDeployment: { agentHostsMode: 'new', agentPolicyId: 'ap-1' },
        agentPolicies: [agentPolicy('ap-1', [packagePolicy('pp-ec2'), packagePolicy('pp-s3')])],
        agents: [agent('a1', 'online', 'ap-1')],
        awsServicesMap: new Map([
          ['s3', entry('s3')],
          ['ec2', entry('ec2')],
        ]),
        instances: [
          { instanceId: 's3', serviceId: 's3' },
          { instanceId: 'ec2', serviceId: 'ec2' },
        ],
      });

      expect(result.current.packagePolicyByInstanceId.s3?.id).toBe('pp-s3');
      expect(result.current.packagePolicyByInstanceId.ec2?.id).toBe('pp-ec2');
    });
  });

  describe('agents that cannot run the deployed integration', () => {
    it('is unhealthy when the agent is too old for the deployed package, despite reporting Healthy', () => {
      const { result } = setup({ agentPolicies: [policyNeeding94], agents: [versioned('8.18.0')] });

      expect(result.current.summaryByInstanceId.s3).toMatchObject({
        health: 'unhealthy',
        issue: {
          type: 'incompatible_version',
          agentVersion: '8.18.0',
          minVersion: '9.4.0',
          integrations: ['AWS'],
        },
      });
    });

    it('is healthy when the agent satisfies the package version', () => {
      const { result } = setup({ agentPolicies: [policyNeeding94], agents: [versioned('9.6.0')] });

      expect(result.current.summaryByInstanceId.s3).toMatchObject({ health: 'healthy' });
      expect(result.current.summaryByInstanceId.s3.issue).toBeUndefined();
    });

    describe('integration not running', () => {
      const NONE = { total: 0, stopped: 0 };

      it('gives a starting integration time before calling it not running', () => {
        mockGetUnitSummary.mockReturnValue(NONE);
        const { result } = setup({
          agentPolicies: [policyNeeding94],
          agents: [versioned('9.6.0')],
        });

        expect(result.current.summaryByInstanceId.s3.health).toBe('healthy');
        expect(result.current.summaryByInstanceId.s3.issue).toBeUndefined();
      });

      it('still holds back when the grace period is almost over', () => {
        mockGetUnitSummary.mockReturnValue(NONE);
        const { result, pollAfter } = setup({
          agentPolicies: [policyNeeding94],
          agents: [versioned('9.6.0')],
        });

        pollAfter(NOT_RUNNING_GRACE_MS - 1);

        expect(result.current.summaryByInstanceId.s3.issue).toBeUndefined();
      });

      it('is unhealthy once an up-to-date agent has run no unit of the package policy for the grace period', () => {
        mockGetUnitSummary.mockReturnValue(NONE);
        const { result, pollAfter } = setup({
          agentPolicies: [policyNeeding94],
          agents: [versioned('9.6.0')],
        });

        pollAfter(NOT_RUNNING_GRACE_MS);

        expect(result.current.summaryByInstanceId.s3).toMatchObject({
          health: 'unhealthy',
          issue: { type: 'not_running' },
        });
      });

      it('is unhealthy once every unit of the package policy has stayed stopped for the grace period', () => {
        mockGetUnitSummary.mockReturnValue({ total: 4, stopped: 4 });
        const { result, pollAfter } = setup({
          agentPolicies: [policyNeeding94],
          agents: [versioned('9.6.0')],
        });

        pollAfter(NOT_RUNNING_GRACE_MS);

        expect(result.current.summaryByInstanceId.s3.issue).toEqual({ type: 'not_running' });
      });

      it('forgets a start-up that recovers, so a later dip gets a fresh grace period', () => {
        mockGetUnitSummary.mockReturnValue(NONE);
        const { result, pollAfter } = setup({
          agentPolicies: [policyNeeding94],
          agents: [versioned('9.6.0')],
        });

        mockGetUnitSummary.mockReturnValue({ total: 3, stopped: 0 });
        pollAfter(30_000);
        expect(result.current.summaryByInstanceId.s3.issue).toBeUndefined();

        mockGetUnitSummary.mockReturnValue(NONE);
        pollAfter(100_000);
        expect(result.current.summaryByInstanceId.s3.issue).toBeUndefined();

        pollAfter(100_000 + NOT_RUNNING_GRACE_MS);
        expect(result.current.summaryByInstanceId.s3.issue).toEqual({ type: 'not_running' });
      });

      it('switches to receiving as soon as the units appear, without waiting out the grace period', () => {
        mockGetUnitSummary.mockReturnValue(NONE);
        const { result, pollAfter } = setup({
          agentPolicies: [policyNeeding94],
          agents: [versioned('9.6.0')],
          awsServicesMap: new Map([['s3', entry('s3', { dataFormat: 'otel' })]]),
          incomingData: { 'aws@4.0.0:a1': ['a1'] },
        });

        // Starting up: no live units, so the data in the streams is not this integration's yet.
        pollAfter(60_000);
        expect(result.current.summaryByInstanceId.s3.issue).toBeUndefined();
        expect(result.current.hasDataByInstanceId.s3).toBe(false);

        // The units come up well before the grace period ends.
        mockGetUnitSummary.mockReturnValue({ total: 3, stopped: 0 });
        pollAfter(70_000);

        expect(OTEL_NOT_RUNNING_GRACE_MS).toBeGreaterThan(70_000);
        expect(result.current.hasDataByInstanceId.s3).toBe(true);
        expect(result.current.summaryByInstanceId.s3.noLiveUnits).toBeUndefined();
        expect(result.current.summaryByInstanceId.s3.issue).toBeUndefined();
      });

      it('also recovers after the grace period has run out and the issue was shown', () => {
        mockGetUnitSummary.mockReturnValue(NONE);
        const { result, pollAfter } = setup({
          agentPolicies: [policyNeeding94],
          agents: [versioned('9.6.0')],
          incomingData: { 'aws@4.0.0': ['a1'] },
        });

        pollAfter(NOT_RUNNING_GRACE_MS);
        expect(result.current.summaryByInstanceId.s3.issue).toEqual({ type: 'not_running' });

        mockGetUnitSummary.mockReturnValue({ total: 3, stopped: 0 });
        pollAfter(NOT_RUNNING_GRACE_MS + 10_000);

        expect(result.current.summaryByInstanceId.s3.issue).toBeUndefined();
        expect(result.current.summaryByInstanceId.s3.health).toBe('healthy');
        expect(result.current.hasDataByInstanceId.s3).toBe(true);
      });

      describe('OTel services', () => {
        const otelMap = new Map([['s3', entry('s3', { dataFormat: 'otel' })]]);

        it('gets longer than a normal service, since the collector restarts to pick the integration up', () => {
          mockGetUnitSummary.mockReturnValue(NONE);
          const { result, pollAfter } = setup({
            agentPolicies: [policyNeeding94],
            agents: [versioned('9.6.0')],
            awsServicesMap: otelMap,
          });

          pollAfter(NOT_RUNNING_GRACE_MS);
          expect(result.current.summaryByInstanceId.s3.issue).toBeUndefined();

          pollAfter(OTEL_NOT_RUNNING_GRACE_MS - 1);
          expect(result.current.summaryByInstanceId.s3.issue).toBeUndefined();
        });

        it('is flagged once that longer period has passed', () => {
          mockGetUnitSummary.mockReturnValue(NONE);
          const { result, pollAfter } = setup({
            agentPolicies: [policyNeeding94],
            agents: [versioned('9.6.0')],
            awsServicesMap: otelMap,
          });

          pollAfter(OTEL_NOT_RUNNING_GRACE_MS);

          expect(result.current.summaryByInstanceId.s3.issue).toEqual({ type: 'not_running' });
        });

        it('allows more than the roughly 5 minutes an OTel integration took to start locally', () => {
          const OBSERVED_START_MS = 5 * 60 * 1000;

          expect(OTEL_NOT_RUNNING_GRACE_MS).toBeGreaterThan(OBSERVED_START_MS);
        });

        it('stays below the detection timeout, so a real failure shows before it gives up', () => {
          const DETECTION_TIMEOUT_MS = 10 * 60 * 1000;

          expect(OTEL_NOT_RUNNING_GRACE_MS).toBeLessThan(DETECTION_TIMEOUT_MS);
        });

        it('does not stretch the wait for a normal service', () => {
          mockGetUnitSummary.mockReturnValue(NONE);
          const { result, pollAfter } = setup({
            agentPolicies: [policyNeeding94],
            agents: [versioned('9.6.0')],
          });

          pollAfter(NOT_RUNNING_GRACE_MS);

          expect(result.current.summaryByInstanceId.s3.issue).toEqual({ type: 'not_running' });
        });
      });

      it('does not delay an agent that is too old, which cannot start up later', () => {
        mockGetUnitSummary.mockReturnValue(NONE);
        const { result } = setup({
          agentPolicies: [policyNeeding94],
          agents: [versioned('8.18.0')],
        });

        expect(result.current.summaryByInstanceId.s3.issue).toMatchObject({
          type: 'incompatible_version',
        });
      });
    });

    it('says the agent is unhealthy only because of other integrations when the deployed one is fine', () => {
      const { result } = setup({
        agentPolicies: [policyNeeding94],
        agents: [versioned('9.6.0', { status: 'error' })],
      });

      expect(result.current.summaryByInstanceId.s3).toMatchObject({
        health: 'healthy',
        unhealthyElsewhere: true,
      });
    });

    it('does not say that while the integration has no live units yet', () => {
      mockGetUnitSummary.mockReturnValue({ total: 0, stopped: 0 });
      const { result } = setup({
        agentPolicies: [policyNeeding94],
        agents: [versioned('9.6.0', { status: 'error' })],
      });

      expect(result.current.summaryByInstanceId.s3.unhealthyElsewhere).toBeUndefined();
    });

    it('does not say that for an agent that is simply healthy', () => {
      const { result } = setup({ agentPolicies: [policyNeeding94], agents: [versioned('9.6.0')] });

      expect(result.current.summaryByInstanceId.s3.unhealthyElsewhere).toBeUndefined();
    });

    it('gives an agent that is still applying the latest policy time to catch up', () => {
      mockGetUnitSummary.mockReturnValue({ total: 0, stopped: 0 });
      const { result } = setup({
        agentPolicies: [policyNeeding94],
        agents: [versioned('9.6.0', { policy_revision: 2 })],
      });

      expect(result.current.summaryByInstanceId.s3.health).toBe('healthy');
    });

    it('cannot tell without the agent policy, so the agent status stands', () => {
      mockGetUnitSummary.mockReturnValue({ total: 0, stopped: 0 });
      const { result } = setup({ agentPolicies: [], agents: [versioned('8.18.0')] });

      expect(result.current.summaryByInstanceId.s3.health).toBe('healthy');
    });

    it('still asks about data for an agent that cannot run the integration', () => {
      setup({ agentPolicies: [policyNeeding94], agents: [versioned('8.18.0')] });

      // A document attributable to the agent would still be real data, so detection keeps going.
      expect(mockUseQuery.mock.calls[0][0].enabled).toBe(true);
    });
  });

  describe('asking Fleet about many agents', () => {
    const AGENTS = (count: number) =>
      Array.from({ length: count }, (_, i) => agent(`a${i}`, 'online', 'policy-s3'));
    const requestedIds = () => mockSendIncomingData.mock.calls.map(([{ agentsIds }]) => agentsIds);

    beforeEach(() => mockSendIncomingData.mockResolvedValue({ data: { items: [] } }));

    it('sends the ids of a small policy in one request', async () => {
      setup({ agents: AGENTS(100) });

      await mockUseQuery.mock.calls[0][0].queryFn();

      expect(requestedIds()).toHaveLength(1);
      expect(requestedIds()[0]).toHaveLength(100);
    });

    it('splits a large policy into batches, so the request URL stays small', async () => {
      setup({ agents: AGENTS(250) });

      await mockUseQuery.mock.calls[0][0].queryFn();

      expect(requestedIds().map((ids) => ids.length)).toEqual([100, 100, 50]);
      expect(requestedIds().flat()).toEqual(AGENTS(250).map(({ id }) => id));
    });

    it('asks about every batch even when an early one has data', async () => {
      mockSendIncomingData.mockImplementation(async ({ agentsIds }) => ({
        data: { items: agentsIds.includes('a3') ? [{ a3: { data: true } }] : [] },
      }));
      setup({ agents: AGENTS(250) });

      await mockUseQuery.mock.calls[0][0].queryFn();

      expect(requestedIds().map((ids) => ids.length)).toEqual([100, 100, 50]);
    });

    it('keeps the agents with data from different batches, so every instance is answered', async () => {
      // Instances sharing a package share one request, and each needs its own agents answered.
      mockSendIncomingData.mockImplementation(async ({ agentsIds }) => ({
        data: {
          items: ['a3', 'a230']
            .filter((id) => agentsIds.includes(id))
            .map((id) => ({ [id]: { data: true } })),
        },
      }));
      setup({ agents: AGENTS(250) });

      const result = await mockUseQuery.mock.calls[0][0].queryFn();

      expect(result).toEqual({ 'aws@4.0.0': ['a3', 'a230'] });
    });

    it('finds data in a later batch', async () => {
      mockSendIncomingData.mockImplementation(async ({ agentsIds }) => ({
        data: { items: agentsIds.includes('a230') ? [{ a230: { data: true } }] : [] },
      }));
      setup({ agents: AGENTS(250) });

      const result = await mockUseQuery.mock.calls[0][0].queryFn();

      expect(requestedIds()).toHaveLength(3);
      expect(result).toEqual({ 'aws@4.0.0': ['a230'] });
    });

    it('reports no data when no batch has any', async () => {
      setup({ agents: AGENTS(250) });

      expect(await mockUseQuery.mock.calls[0][0].queryFn()).toEqual({ 'aws@4.0.0': [] });
    });
  });

  describe('when the agent list is truncated', () => {
    it('does not call an instance healthy, since an omitted agent may not be', () => {
      const { result } = setup({ isTruncated: true });

      expect(result.current.summaryByInstanceId.s3.health).toBe('pending');
    });

    it('marks the verdict incomplete, so the badge does not show the agent as healthy', () => {
      const { result } = setup({ isTruncated: true });

      expect(result.current.summaryByInstanceId.s3.isIncomplete).toBe(true);
    });

    it('does not mark a complete list, or an unhealthy agent that was seen, incomplete', () => {
      mockGetComponentAlertLevel.mockReturnValue('error');
      const unhealthy = setup({ isTruncated: true, agents: [agent('a1', 'error', 'policy-s3')] });
      expect(unhealthy.result.current.summaryByInstanceId.s3.isIncomplete).toBeUndefined();

      mockGetComponentAlertLevel.mockReturnValue(null);
      const complete = setup({ isTruncated: false });
      expect(complete.result.current.summaryByInstanceId.s3.isIncomplete).toBeUndefined();
    });

    it('does not claim the integration runs fine while the agent is unhealthy elsewhere', () => {
      const elsewhere = {
        agentPolicies: [policyNeeding94],
        agents: [versioned('9.6.0', { status: 'error' })],
      };

      expect(setup(elsewhere).result.current.summaryByInstanceId.s3.unhealthyElsewhere).toBe(true);
      expect(
        setup({ ...elsewhere, isTruncated: true }).result.current.summaryByInstanceId.s3
          .unhealthyElsewhere
      ).toBeUndefined();
    });

    it('still reports an unhealthy agent that was seen', () => {
      mockGetComponentAlertLevel.mockReturnValue('error');
      const { result } = setup({ isTruncated: true, agents: [agent('a1', 'error', 'policy-s3')] });

      expect(result.current.summaryByInstanceId.s3.health).toBe('unhealthy');
    });

    it('keeps the live agents, so their data still counts', () => {
      const { result } = setup({ isTruncated: true });

      expect(result.current.summaryByInstanceId.s3.liveAgentIds).toEqual(['a1']);
    });

    it('reports healthy when the list is complete', () => {
      const { result } = setup({ isTruncated: false });

      expect(result.current.summaryByInstanceId.s3.health).toBe('healthy');
    });
  });

  describe('polling', () => {
    it('polls agents and data every 10s while services are settling', () => {
      setup({ shouldPoll: true });

      expect(mockUsePolicyAgents.mock.calls[0][1].refetchInterval).toBe(10_000);
      expect(mockUseQuery.mock.calls[0][0].refetchInterval).toBe(10_000);
    });

    it('stops polling once everything has settled', () => {
      setup({ shouldPoll: false });

      expect(mockUsePolicyAgents.mock.calls[0][1].refetchInterval).toBe(false);
      expect(mockUseQuery.mock.calls[0][0].refetchInterval).toBe(false);
    });
  });

  describe('incoming data', () => {
    const runQueryFn = () => mockUseQuery.mock.calls[0][0].queryFn();

    it('asks Fleet about the deployed package version for the instance agents', async () => {
      mockSendIncomingData.mockResolvedValue({ data: { items: [{ a1: { data: true } }] } });
      setup();

      const result = await runQueryFn();

      expect(mockSendIncomingData).toHaveBeenCalledWith({
        agentsIds: ['a1'],
        pkgName: 'aws',
        pkgVersion: '4.0.0',
      });
      expect(result).toEqual({ 'aws@4.0.0': ['a1'] });
    });

    it('keeps only the agents Fleet reports data for', async () => {
      mockSendIncomingData.mockResolvedValue({
        data: { items: [{ a1: { data: true } }, { a2: { data: false } }] },
      });
      setup({
        agents: [agent('a1', 'online', 'policy-s3'), agent('a2', 'online', 'policy-s3')],
      });

      expect(await runQueryFn()).toEqual({ 'aws@4.0.0': ['a1'] });
    });

    it('issues a single request per package for several instances', async () => {
      mockSendIncomingData.mockResolvedValue({ data: { items: [] } });
      setup({
        deploymentMethod: 'agent_based',
        policyIdsByInstance: { s3: 'pp-s3', ec2: 'pp-ec2' },
        agentBasedDeployment: { agentHostsMode: 'new', agentPolicyId: 'ap-1' },
        agentPolicies: [agentPolicy('ap-1', [packagePolicy('pp-s3'), packagePolicy('pp-ec2')])],
        agents: [agent('a1', 'online', 'ap-1')],
        awsServicesMap: new Map([
          ['s3', entry('s3')],
          ['ec2', entry('ec2')],
        ]),
        instances: [
          { instanceId: 's3', serviceId: 's3' },
          { instanceId: 'ec2', serviceId: 'ec2' },
        ],
      });

      await runQueryFn();

      expect(mockSendIncomingData).toHaveBeenCalledTimes(1);
    });

    it('uses the package a service belongs to, not always aws', async () => {
      mockSendIncomingData.mockResolvedValue({ data: { items: [] } });
      setup({
        awsServicesMap: new Map([['s3', entry('s3', { packageName: 'aws_securityhub' })]]),
        agentPolicies: [
          agentPolicy('policy-s3', [packagePolicy('policy-s3', 'aws_securityhub', '1.2.0')]),
        ],
      });

      await runQueryFn();

      expect(mockSendIncomingData).toHaveBeenCalledWith(
        expect.objectContaining({ pkgName: 'aws_securityhub', pkgVersion: '1.2.0' })
      );
    });

    it('asks per agent for OTel services', async () => {
      mockSendIncomingData.mockResolvedValue({ data: { items: [] } });
      setup({
        awsServicesMap: new Map([['s3', entry('s3', { dataFormat: 'otel' })]]),
        agentPolicies: [
          agentPolicy('policy-s3', [packagePolicy('policy-s3')], { supports_agentless: true }),
        ],
        agents: [agent('a1', 'online', 'policy-s3'), agent('a2', 'online', 'policy-s3')],
      });

      await runQueryFn();

      expect(mockSendIncomingData).toHaveBeenCalledTimes(2);
      expect(mockSendIncomingData).toHaveBeenCalledWith(
        expect.objectContaining({ agentsIds: ['a1'] })
      );
      expect(mockSendIncomingData).toHaveBeenCalledWith(
        expect.objectContaining({ agentsIds: ['a2'] })
      );
    });

    it('does not ask about data before the agent exists', () => {
      setup({ agents: [] });

      expect(mockUseQuery.mock.calls[0][0].enabled).toBe(false);
    });

    it('does not ask about data until the package version is known', () => {
      setup({ agentPolicies: [] });

      expect(mockUseQuery.mock.calls[0][0].enabled).toBe(false);
    });

    it('ignores data in the package streams while the integration runs no unit of its own', () => {
      // Another integration of the same package on the agent can be what produces the data.
      mockGetUnitSummary.mockReturnValue({ total: 0, stopped: 0 });
      const { result } = setup({ incomingData: { 'aws@4.0.0': ['a1'] } });

      expect(result.current.hasDataByInstanceId).toEqual({ s3: false });
      expect(result.current.summaryByInstanceId.s3.noLiveUnits).toBe(true);
    });

    it('ignores that data while every unit of the integration is stopped', () => {
      mockGetUnitSummary.mockReturnValue({ total: 3, stopped: 3 });
      const { result } = setup({ incomingData: { 'aws@4.0.0': ['a1'] } });

      expect(result.current.hasDataByInstanceId).toEqual({ s3: false });
    });

    it('counts the data once the integration has a live unit', () => {
      mockGetUnitSummary.mockReturnValue({ total: 3, stopped: 1 });
      const { result } = setup({ incomingData: { 'aws@4.0.0': ['a1'] } });

      expect(result.current.hasDataByInstanceId).toEqual({ s3: true });
    });

    it('reports data per instance from the answer', () => {
      const { result } = setup({ incomingData: { 'aws@4.0.0': ['a1'] } });

      expect(result.current.hasDataByInstanceId).toEqual({ s3: true });
    });

    it('reports no data when Fleet has not answered yet', () => {
      const { result } = setup({ incomingData: undefined });

      expect(result.current.hasDataByInstanceId).toEqual({ s3: false });
    });

    it('reports no data when only another instance agent has it', () => {
      const { result } = setup({ incomingData: { 'aws@4.0.0': ['someone-else'] } });

      expect(result.current.hasDataByInstanceId).toEqual({ s3: false });
    });
  });

  describe('each agent is judged against its own agent policy', () => {
    const NONE = { total: 0, stopped: 0 };
    const onPolicy = (id: string, policyId: string, extra: Record<string, unknown> = {}) =>
      agent(id, 'online', policyId, {
        policy_revision: 3,
        local_metadata: { elastic: { agent: { version: '9.6.0' } } },
        components: [{ id: 'system-metrics' }],
        ...extra,
      });
    const existingPolicies = {
      deploymentMethod: 'agent_based' as const,
      policyIdsByInstance: { s3: 'pp-s3' },
      agentBasedDeployment: {
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['ap-a', 'ap-b'],
      },
    };
    // Two selected policies whose revisions are unrelated; both carry the deployed package policy.
    const policyA = agentPolicy('ap-a', [packagePolicy('pp-s3')], { revision: 100 });
    const policyB = agentPolicy('ap-b', [packagePolicy('pp-s3')], { revision: 3 });

    it("does not hold an agent to another selected policy's revision", () => {
      mockGetUnitSummary.mockReturnValue(NONE);
      const { result, pollAfter } = setup({
        ...existingPolicies,
        agentPolicies: [policyA, policyB],
        agents: [onPolicy('a2', 'ap-b')],
      });

      pollAfter(NOT_RUNNING_GRACE_MS);

      // The agent is current at revision 3 on its own policy, so a missing integration shows.
      expect(result.current.summaryByInstanceId.s3.issue).toEqual({ type: 'not_running' });
    });

    it('still lets an agent that is behind its own policy catch up', () => {
      mockGetUnitSummary.mockReturnValue(NONE);
      const { result, pollAfter } = setup({
        ...existingPolicies,
        agentPolicies: [policyA, policyB],
        agents: [onPolicy('a1', 'ap-a', { policy_revision: 99 })],
      });

      pollAfter(NOT_RUNNING_GRACE_MS);

      expect(result.current.summaryByInstanceId.s3.issue).toBeUndefined();
    });

    it('shows the policy of the agent the badge represents in the flyout', () => {
      mockGetComponentAlertLevel.mockImplementation((a: { id: string }) =>
        a.id === 'a2' ? 'failed' : null
      );
      const { result } = setup({
        ...existingPolicies,
        agentPolicies: [policyA, policyB],
        agents: [onPolicy('a1', 'ap-a', { policy_revision: 100 }), onPolicy('a2', 'ap-b')],
      });

      expect(result.current.summaryByInstanceId.s3.agent).toMatchObject({ id: 'a2' });
      expect(result.current.agentPolicyByInstanceId.s3?.id).toBe('ap-b');
      expect(result.current.packagePolicyByInstanceId.s3?.id).toBe('pp-s3');
    });

    it('resolves an agent on a version-specific policy variant to its policy', () => {
      mockGetUnitSummary.mockReturnValue(NONE);
      const { result, pollAfter } = setup({
        ...existingPolicies,
        agentPolicies: [policyA, policyB],
        agents: [onPolicy('a2', 'ap-b#9.2', { policy_base_id: 'ap-b' })],
      });

      pollAfter(NOT_RUNNING_GRACE_MS);

      expect(result.current.summaryByInstanceId.s3.issue).toEqual({ type: 'not_running' });
      expect(result.current.agentPolicyByInstanceId.s3?.id).toBe('ap-b');
    });

    it('falls back to the first selected policy carrying the package policy before any agent exists', () => {
      const { result } = setup({
        ...existingPolicies,
        agentPolicies: [policyA, policyB],
        agents: [],
      });

      expect(result.current.agentPolicyByInstanceId.s3?.id).toBe('ap-a');
      expect(result.current.packagePolicyByInstanceId.s3?.id).toBe('pp-s3');
    });

    it('judges by agent status alone when the policy of an agent was not fetched', () => {
      const { result } = setup({
        ...existingPolicies,
        agentPolicies: [policyA],
        agents: [onPolicy('a2', 'ap-b', { status: 'error' })],
      });

      expect(result.current.summaryByInstanceId.s3.health).toBe('unhealthy');
    });
  });

  describe('where an instance data comes from', () => {
    const otel = new Map([['s3', entry('s3', { dataFormat: 'otel' })]]);
    const agentless = agentPolicy('policy-s3', [packagePolicy('policy-s3')], {
      supports_agentless: true,
    });

    it('uses index patterns for OTel on a policy that is not agentless', () => {
      // The agent data API cannot attribute OTel data there, and for an input package it matches
      // whatever else the agent writes, such as its System integration.
      const { result } = setup({ awsServicesMap: otel });

      expect(result.current.dataSourceByInstanceId).toEqual({ s3: 'patterns' });
      expect(mockUseQuery.mock.calls[0][0].enabled).toBe(false);
      expect(result.current.hasDataByInstanceId).toEqual({});
    });

    it('uses the agent data API for OTel on an agentless policy', () => {
      const { result } = setup({ awsServicesMap: otel, agentPolicies: [agentless] });

      expect(result.current.dataSourceByInstanceId).toEqual({ s3: 'agent' });
      expect(mockUseQuery.mock.calls[0][0].enabled).toBe(true);
    });

    it('does not trust the agent data API for OTel until the policy is known', () => {
      const { result } = setup({ awsServicesMap: otel, agentPolicies: [] });

      expect(result.current.dataSourceByInstanceId).toEqual({ s3: 'patterns' });
    });

    it.each([
      ['not agentless', agentPolicy('policy-s3', [packagePolicy('policy-s3')])],
      ['agentless', agentless],
    ])(
      'uses the agent data API for a package that is not OTel, on a policy that is %s',
      (_, policy) => {
        const { result } = setup({ agentPolicies: [policy] });

        expect(result.current.dataSourceByInstanceId).toEqual({ s3: 'agent' });
      }
    );

    it('does not list ECF instances, which have no agent', () => {
      const { result } = setup({ deploymentMethod: 'ecf', policyIdsByInstance: {} });

      expect(result.current.dataSourceByInstanceId).toEqual({});
    });

    it('still reports the health of an OTel agent when its data comes from patterns', () => {
      const { result } = setup({ awsServicesMap: otel });

      expect(result.current.summaryByInstanceId.s3.health).toBe('healthy');
    });
  });

  describe('only agents running the integration can supply its data', () => {
    const onlyA1Runs = (a: { id: string }) =>
      a.id === 'a1' ? { total: 3, stopped: 0 } : { total: 0, stopped: 0 };
    const online = (id: string) =>
      agent(id, 'online', 'policy-s3', { policy_revision: 3, components: [{ id: 'system' }] });
    const policy = agentPolicy('policy-s3', [packagePolicy('policy-s3')], { revision: 3 });

    beforeEach(() => mockGetUnitSummary.mockImplementation(onlyA1Runs));

    it('lists the agents that run it', () => {
      const { result } = setup({
        agentPolicies: [policy],
        agents: [online('a1'), online('a2')],
      });

      expect(result.current.summaryByInstanceId.s3).toMatchObject({
        agentIds: ['a1', 'a2'],
        liveAgentIds: ['a1'],
      });
      expect(result.current.summaryByInstanceId.s3.noLiveUnits).toBeUndefined();
    });

    it('asks only about the agents that run it', async () => {
      mockSendIncomingData.mockResolvedValue({ data: { items: [] } });
      setup({ agentPolicies: [policy], agents: [online('a1'), online('a2')] });

      await mockUseQuery.mock.calls[0][0].queryFn();

      expect(mockSendIncomingData).toHaveBeenCalledTimes(1);
      expect(mockSendIncomingData).toHaveBeenCalledWith(
        expect.objectContaining({ agentsIds: ['a1'] })
      );
    });

    it('ignores data from an agent that has not started the integration', () => {
      // The second agent can be reporting data from an older integration of the same package.
      const { result } = setup({
        agentPolicies: [policy],
        agents: [online('a1'), online('a2')],
        incomingData: { 'aws@4.0.0': ['a2'] },
      });

      expect(result.current.hasDataByInstanceId).toEqual({ s3: false });
    });

    it('counts data from the agent that runs it', () => {
      const { result } = setup({
        agentPolicies: [policy],
        agents: [online('a1'), online('a2')],
        incomingData: { 'aws@4.0.0': ['a1'] },
      });

      expect(result.current.hasDataByInstanceId).toEqual({ s3: true });
    });

    it('asks per live agent only for OTel services', async () => {
      mockSendIncomingData.mockResolvedValue({ data: { items: [] } });
      setup({
        awsServicesMap: new Map([['s3', entry('s3', { dataFormat: 'otel' })]]),
        agentPolicies: [
          agentPolicy('policy-s3', [packagePolicy('policy-s3')], {
            revision: 3,
            supports_agentless: true,
          }),
        ],
        agents: [online('a1'), online('a2')],
      });

      await mockUseQuery.mock.calls[0][0].queryFn();

      expect(mockSendIncomingData).toHaveBeenCalledTimes(1);
      expect(mockSendIncomingData).toHaveBeenCalledWith(
        expect.objectContaining({ agentsIds: ['a1'] })
      );
    });

    it('reports no data when no agent runs the integration, whatever the data says', () => {
      mockGetUnitSummary.mockReturnValue({ total: 0, stopped: 0 });
      const { result } = setup({
        agentPolicies: [policy],
        agents: [online('a1'), online('a2')],
        incomingData: { 'aws@4.0.0': ['a1', 'a2'] },
      });

      expect(result.current.hasDataByInstanceId).toEqual({ s3: false });
      expect(result.current.summaryByInstanceId.s3.noLiveUnits).toBe(true);
    });
  });
});
