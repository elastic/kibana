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
  useBulkGetAgentPoliciesQuery: jest.fn(),
  useGetAgentsQuery: jest.fn(),
}));

import { useQuery } from '@kbn/react-query';
import {
  getComponentAlertLevel,
  getPackagePolicyUnitSummary,
  sendGetAgentIncomingData,
  useBulkGetAgentPoliciesQuery,
  useGetAgentsQuery,
} from '@kbn/fleet-plugin/public';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { useAgentDetection } from './use_agent_detection';

const mockUseQuery = useQuery as jest.Mock;
const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;
const mockGetComponentAlertLevel = getComponentAlertLevel as jest.Mock;
const mockGetUnitSummary = getPackagePolicyUnitSummary as jest.Mock;
const mockSendIncomingData = sendGetAgentIncomingData as jest.Mock;
const mockUseBulkPolicies = useBulkGetAgentPoliciesQuery as jest.Mock;
const mockUseGetAgents = useGetAgentsQuery as jest.Mock;

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
}

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
}: SetupOptions = {}) {
  mockUseOnboardingFlow.mockReturnValue({
    detectAndReviewStep: { policyIdsByInstance },
    awsServicesMap,
    deploymentMethod,
    agentBasedDeployment,
  });
  mockUseBulkPolicies.mockReturnValue({ data: { items: agentPolicies } });
  mockUseGetAgents.mockReturnValue({ data: { data: { items: agents } } });
  mockUseQuery.mockReturnValue({ data: incomingData });
  return renderHook(() => useAgentDetection({ instances, shouldPoll }));
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
      expect(mockUseGetAgents.mock.calls[0][1]).toMatchObject({ enabled: false });
      expect(mockUseQuery.mock.calls[0][0].enabled).toBe(false);
    });

    it('resolves a managed integration through its agentless policy id', () => {
      setup();

      expect(mockUseBulkPolicies).toHaveBeenCalledWith(
        ['policy-s3'],
        expect.objectContaining({ full: true, enabled: true })
      );
      expect(mockUseGetAgents.mock.calls[0][0].kuery).toContain('policy-s3');
      expect(mockUseGetAgents.mock.calls[0][0].kuery).toContain('fleet-agents.policy_base_id');
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
      expect(mockUseGetAgents.mock.calls[0][0].kuery).not.toContain('package-policy-s3');
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
    const versioned = (version: string, extra: Record<string, unknown> = {}) =>
      agent('a1', 'online', 'policy-s3', {
        policy_revision: 3,
        local_metadata: { elastic: { agent: { version } } },
        components: [{ id: 'system-metrics' }],
        ...extra,
      });
    const policyNeeding94 = agentPolicy('policy-s3', [packagePolicy('policy-s3')], {
      revision: 3,
      min_agent_version: '9.4.0',
      package_agent_version_conditions: [
        { name: 'aws', title: 'AWS', version_condition: '>=9.4.0' },
      ],
    });

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

    it('is unhealthy when an up-to-date agent runs no unit of the deployed package policy', () => {
      mockGetUnitSummary.mockReturnValue({ total: 0, stopped: 0 });
      const { result } = setup({ agentPolicies: [policyNeeding94], agents: [versioned('9.6.0')] });

      expect(result.current.summaryByInstanceId.s3).toMatchObject({
        health: 'unhealthy',
        issue: { type: 'not_running' },
      });
    });

    it('is unhealthy when every unit of the deployed package policy has stopped', () => {
      mockGetUnitSummary.mockReturnValue({ total: 4, stopped: 4 });
      const { result } = setup({ agentPolicies: [policyNeeding94], agents: [versioned('9.6.0')] });

      expect(result.current.summaryByInstanceId.s3.issue).toEqual({ type: 'not_running' });
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

  describe('polling', () => {
    it('polls agents and data every 10s while services are settling', () => {
      setup({ shouldPoll: true });

      expect(mockUseGetAgents.mock.calls[0][1].refetchInterval).toBe(10_000);
      expect(mockUseQuery.mock.calls[0][0].refetchInterval).toBe(10_000);
    });

    it('stops polling once everything has settled', () => {
      setup({ shouldPoll: false });

      expect(mockUseGetAgents.mock.calls[0][1].refetchInterval).toBe(false);
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
});
