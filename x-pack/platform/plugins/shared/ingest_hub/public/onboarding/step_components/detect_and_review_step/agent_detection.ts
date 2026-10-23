/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent, AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  getIncompatibleIntegrations,
  removeVersionSuffixFromPolicyId,
} from '@kbn/fleet-plugin/common';
import type { ComponentAlertLevel, PackagePolicyUnitSummary } from '@kbn/fleet-plugin/public';
import type { DeploymentMethod } from '../../aws_service_matrix';
import type { ServiceChipState } from '../../onboarding_flow_context';

export type AgentHealthState = 'healthy' | 'pending' | 'unhealthy';

/** Why an agent that reports itself fine still cannot run the deployed integration. */
export type AgentIssue =
  | {
      type: 'incompatible_version';
      agentVersion: string;
      /** Minimum agent version the policy needs, when Fleet knows it. */
      minVersion?: string;
      integrations: string[];
    }
  | { type: 'not_running' };

export interface InstanceAgentSummary {
  /** `pending` also covers an instance whose agent does not exist yet. */
  health: AgentHealthState;
  /** Agent that best represents the instance (worst first) — drives the badge and the flyout. */
  agent?: Agent;
  agentIds: string[];
  /**
   * The agents that run a live unit of the deployed integration (or whose units are not known).
   * Only these can have produced data that belongs to it.
   */
  liveAgentIds: string[];
  /** Set when the representative agent is unhealthy because it cannot run the integration. */
  issue?: AgentIssue;
  /**
   * The agent reports itself unhealthy, but only because of other integrations; the one this
   * instance deployed is running.
   */
  unhealthyElsewhere?: boolean;
  /**
   * Agents are there, but none runs a live unit of the deployed integration. Data in its streams
   * cannot be its own yet; it comes from another integration of the same package.
   */
  noLiveUnits?: boolean;
  /**
   * The agent list was cut short, so this verdict may miss an unhealthy agent. The badge must not
   * show the agent's own status as if it were the whole picture.
   */
  isIncomplete?: boolean;
}

/**
 * Fleet takes the agent ids in the query string, so a large policy has to go out in batches to
 * keep the request URL within what servers and proxies accept.
 */
export const AGENT_IDS_PER_REQUEST = 100;

/** Splits a list into batches of at most `size`. */
export const toBatches = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size)
  );

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

/** What is known about an agent relative to the package policy this instance deployed. */
export interface AgentAssessment {
  /** Worst unit status of the deployed package policy on the agent. */
  alertLevel: ComponentAlertLevel;
  issue?: AgentIssue;
  /**
   * The agent reports at least one live unit of the deployed package policy. Unknown (undefined)
   * when the package policy could not be looked at.
   */
  hasLiveUnits?: boolean;
}

export type AssessmentByAgentId = Record<string, AgentAssessment>;

const AGENT_STATUSES_THAT_RUN_UNITS: ReadonlySet<string> = new Set(['online', 'degraded', 'error']);

interface AssessAgentParams {
  agent: Agent;
  agentPolicy: Pick<
    AgentPolicy,
    'revision' | 'min_agent_version' | 'package_agent_version_conditions'
  >;
  packageName: string;
  alertLevel: ComponentAlertLevel;
  units: PackagePolicyUnitSummary;
}

/**
 * Spots agents that report Healthy but cannot do the job: a version too old for the deployed
 * package (the same check Fleet uses for its "Incompatible integrations" warning), or an agent
 * that has applied the latest policy yet runs no live unit of the package policy.
 */
export const assessAgent = ({
  agent,
  agentPolicy,
  packageName,
  alertLevel,
  units,
}: AssessAgentParams): AgentAssessment => {
  const hasLiveUnits = units.total > units.stopped;
  const agentVersion = agent.local_metadata?.elastic?.agent?.version;
  const integrations = getIncompatibleIntegrations({
    agentVersion,
    conditions: agentPolicy.package_agent_version_conditions,
    packageName,
  }).map(({ title, name }) => title || name);
  if (agentVersion && integrations.length > 0) {
    return {
      alertLevel,
      hasLiveUnits,
      issue: {
        type: 'incompatible_version',
        agentVersion,
        minVersion: agentPolicy.min_agent_version ?? undefined,
        integrations,
      },
    };
  }

  // An agent that has not applied the latest policy revision, or has reported nothing yet, is
  // still catching up rather than failing.
  const hasAppliedPolicy =
    agent.policy_revision != null &&
    agentPolicy.revision != null &&
    agent.policy_revision >= agentPolicy.revision;
  const isRunningUnits = !!agent.status && AGENT_STATUSES_THAT_RUN_UNITS.has(agent.status);
  const hasReportedComponents = !!agent.components?.length;
  const runsNoLiveUnit = units.total === 0 || units.stopped === units.total;
  if (isRunningUnits && hasAppliedPolicy && hasReportedComponents && runsNoLiveUnit) {
    return { alertLevel, hasLiveUnits, issue: { type: 'not_running' } };
  }

  return { alertLevel, hasLiveUnits };
};

/**
 * An integration can take a while to start after the agent has applied its policy, an OTel
 * collector especially, so "not running" only counts once it has held for this long.
 */
export const NOT_RUNNING_GRACE_MS = 60_000;

/**
 * Longer for OTel integrations: adding one to a policy restarts the agent's OTel collector, and
 * two local runs each took about 5 minutes to bring its units up, so this leaves headroom for a
 * slower machine. Still below the 10 minute detection timeout, so a real failure shows before the
 * tile gives up waiting for data.
 */
export const OTEL_NOT_RUNNING_GRACE_MS = 8 * 60_000;

/** When each `<instance>:<agent>` was first seen not running. */
export type NotRunningSince = Record<string, number>;

/**
 * Holds back a `not_running` issue until it has lasted `graceMs`. Until then the agent is judged
 * without it, so the tile keeps detecting instead of flashing an error while the integration
 * starts. Returns the `since` entries observed in this call, so one that clears is forgotten.
 */
export const applyNotRunningGrace = ({
  assessments,
  keyPrefix,
  previousSince,
  now,
  graceMs = NOT_RUNNING_GRACE_MS,
}: {
  assessments: AssessmentByAgentId;
  keyPrefix: string;
  previousSince: NotRunningSince;
  now: number;
  graceMs?: number;
}): { assessments: AssessmentByAgentId; since: NotRunningSince } => {
  const since: NotRunningSince = {};
  const result: AssessmentByAgentId = {};
  for (const [agentId, assessment] of Object.entries(assessments)) {
    if (assessment.issue?.type !== 'not_running') {
      result[agentId] = assessment;
      continue;
    }
    const key = `${keyPrefix}:${agentId}`;
    const firstSeen = previousSince[key] ?? now;
    since[key] = firstSeen;
    result[agentId] =
      now - firstSeen >= graceMs
        ? assessment
        : { alertLevel: assessment.alertLevel, hasLiveUnits: assessment.hasLiveUnits };
  }
  return { assessments: result, since };
};

/**
 * An agent that cannot run the integration, or whose deployed integration failed or degraded, is
 * unhealthy whatever its own status says. An agent reported unhealthy for a reason outside the
 * deployed integration (for example another integration on a shared policy) still counts as
 * healthy when it reports units for ours and none of them failed. Without an `assessment` there
 * is no way to scope, so the agent status stands.
 */
export const getAgentHealthState = (
  agent: Agent,
  assessment?: AgentAssessment
): AgentHealthState => {
  const { status } = agent;
  if (assessment?.issue || assessment?.alertLevel) return 'unhealthy';
  if (status === 'online') return 'healthy';
  if (!status || status === 'enrolling' || status === 'updating') return 'pending';
  const isFailureOutsideIntegration =
    (status === 'error' || status === 'degraded') && !!assessment && !!agent.components?.length;
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
 * `assessmentByAgentId` scopes each agent's health to the deployed package policy.
 */
export const summarizeInstanceAgents = (
  agents: Agent[],
  assessmentByAgentId: AssessmentByAgentId = {}
): InstanceAgentSummary => {
  const agentIds = agents.map(({ id }) => id);
  const liveAgentIds = agents
    .filter(({ id }) => assessmentByAgentId[id]?.hasLiveUnits !== false)
    .map(({ id }) => id);
  const noLiveUnits = agents.length > 0 && liveAgentIds.length === 0;
  const flags = noLiveUnits ? { noLiveUnits } : {};
  const healthOf = (agent: Agent) => getAgentHealthState(agent, assessmentByAgentId[agent.id]);
  // Prefer an agent with a known issue so the reason can be shown.
  const unhealthyAgents = agents.filter((agent) => healthOf(agent) === 'unhealthy');
  const unhealthy =
    unhealthyAgents.find((agent) => assessmentByAgentId[agent.id]?.issue) ?? unhealthyAgents[0];
  if (unhealthy) {
    return {
      health: 'unhealthy',
      agent: unhealthy,
      agentIds,
      liveAgentIds,
      issue: assessmentByAgentId[unhealthy.id]?.issue,
      ...flags,
    };
  }
  const healthy = agents.find((agent) => healthOf(agent) === 'healthy');
  if (healthy) {
    // Only say the integration is running when it has live units; while it is still starting, the
    // agent's own status is all there is to show.
    const unhealthyElsewhere =
      !noLiveUnits && (healthy.status === 'error' || healthy.status === 'degraded');
    return {
      health: 'healthy',
      agent: healthy,
      agentIds,
      liveAgentIds,
      ...(unhealthyElsewhere && { unhealthyElsewhere }),
      ...flags,
    };
  }
  return { health: 'pending', agent: agents[0], agentIds, liveAgentIds, ...flags };
};

const getAgentPolicyBaseId = (agent: Agent): string | undefined => {
  const id = agent.policy_base_id ?? agent.policy_id;
  return id ? removeVersionSuffixFromPolicyId(id) : undefined;
};

/**
 * The agent policy an agent is enrolled in. Selected policies have independent revisions, so an
 * agent has to be judged against its own policy, not whichever selected policy comes first.
 * Matched on the base id so a version-specific variant resolves to its policy.
 */
export const findAgentPolicyForAgent = (
  agent: Agent,
  agentPolicies: AgentPolicy[]
): AgentPolicy | undefined => {
  const baseId = getAgentPolicyBaseId(agent);
  return baseId
    ? agentPolicies.find(({ id }) => removeVersionSuffixFromPolicyId(id) === baseId)
    : undefined;
};

/** The deployed package policy inside an agent policy, if that policy carries it. */
export const findPackagePolicyInAgentPolicy = (
  agentPolicy: AgentPolicy | undefined,
  packagePolicyId: string
): PackagePolicy | undefined =>
  (agentPolicy?.package_policies as PackagePolicy[] | undefined)?.find(
    ({ id }) => id === packagePolicyId
  );

/**
 * Whether the Fleet agent data API can answer for an instance. It cannot attribute native OTel
 * data to an agent unless the policy is agentless: elsewhere it either filters on an `agent.id`
 * that OTel data lacks, or, because an input package has no data streams of its own to scope by,
 * matches whatever else the agent writes (its System integration, its own monitoring). Those
 * instances are detected through index patterns instead. An unknown policy counts as not
 * agentless, so OTel never trusts an answer the API may not be able to give.
 */
export const usesAgentDataApi = ({
  isOtel,
  agentPolicy,
}: {
  isOtel: boolean;
  agentPolicy?: Pick<AgentPolicy, 'supports_agentless'>;
}): boolean => !isOtel || agentPolicy?.supports_agentless === true;

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
