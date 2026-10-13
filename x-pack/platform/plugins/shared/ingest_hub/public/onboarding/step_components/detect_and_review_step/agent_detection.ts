/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '@kbn/fleet-plugin/common';
import { removeVersionSuffixFromPolicyId } from '@kbn/fleet-plugin/common';
import type { ComponentAlertLevel } from '@kbn/fleet-plugin/public';
import type { DeploymentMethod } from '../../aws_service_matrix';
import type { ServiceChipState } from '../../onboarding_flow_context';

export type AgentHealthState = 'healthy' | 'pending' | 'unhealthy';

export interface InstanceAgentSummary {
  /** `pending` also covers an instance whose agent does not exist yet. */
  health: AgentHealthState;
  /** Agent that best represents the instance (worst first) — drives the badge and the flyout. */
  agent?: Agent;
  agentIds: string[];
}

export interface DataRequestInstance {
  agentIds: string[];
  packageName: string;
  packageVersion: string;
  /** Native OTel data has no agent identity, so Fleet only answers per single agent. */
  isOtel: boolean;
}

export interface IncomingDataRequest {
  key: string;
  pkgName: string;
  pkgVersion: string;
  agentIds: string[];
}

/** Agents that are gone or leaving say nothing about whether the integration works. */
const NOT_RUNNING_AGENT_STATUSES: ReadonlySet<string> = new Set([
  'inactive',
  'unenrolled',
  'unenrolling',
  'uninstalled',
  'orphaned',
]);

/** Per agent id: the worst unit status of the deployed package policy on that agent. */
export type AlertLevelByAgentId = Record<string, ComponentAlertLevel>;

/**
 * An agent reported unhealthy for a reason outside the deployed integration (for example another
 * integration on a shared policy) still counts as healthy when it reports units for ours and none
 * of them failed. Without `alertLevel` there is no way to scope, so the agent status stands.
 */
export const getAgentHealthState = (
  agent: Agent,
  alertLevel?: ComponentAlertLevel
): AgentHealthState => {
  const { status } = agent;
  if (alertLevel) return 'unhealthy';
  if (status === 'online') return 'healthy';
  if (!status || status === 'enrolling' || status === 'updating') return 'pending';
  const isFailureOutsideIntegration =
    (status === 'error' || status === 'degraded') &&
    alertLevel === null &&
    !!agent.components?.length;
  return isFailureOutsideIntegration ? 'healthy' : 'unhealthy';
};

interface AgentPolicyIdsParams {
  deploymentMethod: DeploymentMethod;
  instanceIds: string[];
  /** Instances with an entry were deployed through Fleet; ECF instances have none. */
  policyIdsByInstance: Record<string, string>;
  agentPolicyId?: string;
  selectedAgentPolicyIds: string[];
  agentHostsMode: 'new' | 'existing';
}

/**
 * Agent policy ids to resolve agents from, per instance. `policyIdsByInstance` holds the agentless
 * policy id for managed integrations (same id as its agent policy) but the *package* policy id
 * for agent-based deploys, so those resolve through the agent policies the wizard attached.
 */
export const getAgentPolicyIdsByInstance = ({
  deploymentMethod,
  instanceIds,
  policyIdsByInstance,
  agentPolicyId,
  selectedAgentPolicyIds,
  agentHostsMode,
}: AgentPolicyIdsParams): Record<string, string[]> => {
  const agentBasedPolicyIds =
    agentHostsMode === 'existing' ? selectedAgentPolicyIds : agentPolicyId ? [agentPolicyId] : [];
  const result: Record<string, string[]> = {};
  for (const instanceId of instanceIds) {
    const policyId = policyIdsByInstance[instanceId];
    if (!policyId) continue;
    result[instanceId] = deploymentMethod === 'agent_based' ? agentBasedPolicyIds : [policyId];
  }
  return result;
};

/**
 * Agents that apply to an instance: running agents attached to any of the given agent policies,
 * including version-specific variants.
 */
export const getApplicableAgents = (agents: Agent[], policyIds: string[]): Agent[] => {
  const baseIds = new Set(policyIds.map(removeVersionSuffixFromPolicyId));
  return agents.filter((agent) => {
    if (agent.status && NOT_RUNNING_AGENT_STATUSES.has(agent.status)) return false;
    const agentPolicyId = agent.policy_base_id ?? agent.policy_id;
    return !!agentPolicyId && baseIds.has(removeVersionSuffixFromPolicyId(agentPolicyId));
  });
};

/**
 * Any unhealthy agent makes the instance unhealthy (most actionable); otherwise a single online
 * agent is enough; with no agents, or none online yet, the instance is still pending.
 * `alertLevelByAgentId` scopes each agent's health to the deployed package policy.
 */
export const summarizeInstanceAgents = (
  agents: Agent[],
  alertLevelByAgentId: AlertLevelByAgentId = {}
): InstanceAgentSummary => {
  const agentIds = agents.map(({ id }) => id);
  const healthOf = (agent: Agent) => getAgentHealthState(agent, alertLevelByAgentId[agent.id]);
  const unhealthy = agents.find((agent) => healthOf(agent) === 'unhealthy');
  if (unhealthy) return { health: 'unhealthy', agent: unhealthy, agentIds };
  const healthy = agents.find((agent) => healthOf(agent) === 'healthy');
  if (healthy) return { health: 'healthy', agent: healthy, agentIds };
  return { health: 'pending', agent: agents[0], agentIds };
};

const AGENT_HEALTH_SEVERITY: Record<AgentHealthState, number> = {
  unhealthy: 0,
  pending: 1,
  healthy: 2,
};

/** The agent-backed instance that most needs attention, or undefined when none has an agent. */
export const pickWorstAgentInstanceId = (
  summaryByInstanceId: Record<string, InstanceAgentSummary>,
  instanceIds: string[]
): string | undefined =>
  instanceIds
    .filter((instanceId) => summaryByInstanceId[instanceId])
    .sort(
      (a, b) =>
        AGENT_HEALTH_SEVERITY[summaryByInstanceId[a].health] -
        AGENT_HEALTH_SEVERITY[summaryByInstanceId[b].health]
    )[0];

const getInstanceRequests = ({
  agentIds,
  packageName,
  packageVersion,
  isOtel,
}: DataRequestInstance): IncomingDataRequest[] => {
  const base = { pkgName: packageName, pkgVersion: packageVersion };
  const key = `${packageName}@${packageVersion}`;
  return isOtel
    ? agentIds.map((agentId) => ({ ...base, key: `${key}:${agentId}`, agentIds: [agentId] }))
    : [{ ...base, key, agentIds }];
};

/**
 * One request per package, covering every agent that runs it. OTel instances get one request per
 * agent because the server can only attribute OTel data when asked about a single agent.
 */
export const buildIncomingDataRequests = (
  instances: DataRequestInstance[]
): IncomingDataRequest[] => {
  const byKey = new Map<string, IncomingDataRequest>();
  for (const request of instances.flatMap(getInstanceRequests)) {
    const existing = byKey.get(request.key);
    byKey.set(request.key, {
      ...request,
      agentIds: [...new Set([...(existing?.agentIds ?? []), ...request.agentIds])],
    });
  }
  return [...byKey.values()];
};

/** `agentIdsWithDataByKey` maps a request key to the agent ids Fleet reported `data: true` for. */
export const instanceHasData = (
  instance: DataRequestInstance,
  agentIdsWithDataByKey: Record<string, string[]>
): boolean =>
  getInstanceRequests(instance).some(({ key }) =>
    (agentIdsWithDataByKey[key] ?? []).some((agentId) => instance.agentIds.includes(agentId))
  );

interface InstanceChipStateParams {
  contextStatus: ServiceChipState;
  deployError: boolean;
  /** Undefined for ECF instances, which have no Fleet agent. */
  agentHealth?: AgentHealthState;
  hasData: boolean;
  isTimedOut: boolean;
}

export const deriveInstanceChipState = ({
  contextStatus,
  deployError,
  agentHealth,
  hasData,
  isTimedOut,
}: InstanceChipStateParams): ServiceChipState => {
  // A deployment failure or an unhealthy agent wins over any data signal.
  if (deployError || contextStatus === 'error' || agentHealth === 'unhealthy') return 'error';
  if (contextStatus === 'receiving') return 'receiving';
  const isSettling = contextStatus === 'detecting' || contextStatus === 'instantiating';
  if (isSettling && hasData) return 'receiving';
  if (isSettling && isTimedOut) return 'timeout';
  return contextStatus;
};

/**
 * Step 4 shows one tile per service, so duplicated instances collapse: any failing instance fails
 * the tile, and it only reports receiving once every instance does.
 */
export const aggregateInstanceChipStates = (states: ServiceChipState[]): ServiceChipState => {
  if (states.length === 0) return 'instantiating';
  if (states.includes('error')) return 'error';
  if (states.includes('timeout')) return 'timeout';
  if (states.every((state) => state === 'receiving')) return 'receiving';
  return states.includes('detecting') ? 'detecting' : 'instantiating';
};
