/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';
import { useQuery } from '@kbn/react-query';
import {
  extractAgentIdsWithData,
  type AgentPolicy,
  type PackagePolicy,
} from '@kbn/fleet-plugin/common';
import {
  getComponentAlertLevel,
  getPackagePolicyUnitSummary,
  sendGetAgentIncomingData,
  useAgentsForPolicyIds,
  useBulkGetAgentPoliciesQuery,
} from '@kbn/fleet-plugin/public';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import {
  applyNotRunningGrace,
  AGENT_IDS_PER_REQUEST,
  NOT_RUNNING_GRACE_MS,
  OTEL_NOT_RUNNING_GRACE_MS,
  assessAgent,
  buildIncomingDataRequests,
  findAgentPolicyForAgent,
  findPackagePolicyInAgentPolicy,
  getAgentPolicyIdsByInstance,
  getApplicableAgents,
  instanceHasData,
  summarizeInstanceAgents,
  toBatches,
  usesAgentDataApi,
  type AssessmentByAgentId,
  type DataRequestInstance,
  type InstanceAgentSummary,
  type NotRunningSince,
} from './agent_detection';

const POLL_INTERVAL_MS = 10_000;

/** Where an instance's data comes from: the Fleet agent data API, or index patterns. */
export type InstanceDataSource = 'agent' | 'patterns';

export interface AgentDetectionResult {
  /** Instances backed by a Fleet agent. ECF instances are absent and keep pattern detection. */
  summaryByInstanceId: Record<string, InstanceAgentSummary>;
  /** Data seen by the Fleet agent data API. Only meaningful for instances whose source is `agent`. */
  hasDataByInstanceId: Record<string, boolean>;
  /**
   * How each agent-backed instance's data is detected. `patterns` for OTel on a policy that is not
   * agentless, where the agent data API cannot attribute the data.
   */
  dataSourceByInstanceId: Record<string, InstanceDataSource>;
  /** Package policy each instance deployed, for the status flyout. */
  packagePolicyByInstanceId: Record<string, PackagePolicy | undefined>;
  agentPolicyByInstanceId: Record<string, AgentPolicy | undefined>;
}

interface UseAgentDetectionParams {
  /** Every instance Step 4 reports on, with the service whose matrix entry it deploys. */
  instances: Array<{ instanceId: string; serviceId: string }>;
  /** Keep polling while any service is still settling. */
  shouldPoll: boolean;
}

export function useAgentDetection({
  instances,
  shouldPoll,
}: UseAgentDetectionParams): AgentDetectionResult {
  const { detectAndReviewStep, awsServicesMap, deploymentMethod, agentBasedDeployment } =
    useOnboardingFlow();
  const { policyIdsByInstance } = detectAndReviewStep;
  const instanceIds = useMemo(() => instances.map(({ instanceId }) => instanceId), [instances]);
  const serviceIdByInstanceId = useMemo(
    () => Object.fromEntries(instances.map(({ instanceId, serviceId }) => [instanceId, serviceId])),
    [instances]
  );
  const { agentPolicyId, selectedAgentPolicyIds, agentHostsMode } = agentBasedDeployment;

  const agentPolicyIdsByInstance = useMemo(
    () =>
      getAgentPolicyIdsByInstance({
        deploymentMethod,
        instanceIds,
        policyIdsByInstance,
        agentPolicyId,
        selectedAgentPolicyIds,
        agentHostsMode,
      }),
    [
      deploymentMethod,
      instanceIds,
      policyIdsByInstance,
      agentPolicyId,
      selectedAgentPolicyIds,
      agentHostsMode,
    ]
  );

  const allPolicyIds = useMemo(
    () => [...new Set(Object.values(agentPolicyIdsByInstance).flat())].sort(),
    [agentPolicyIdsByInstance]
  );
  const hasPolicies = allPolicyIds.length > 0;

  const { data: policiesData } = useBulkGetAgentPoliciesQuery(allPolicyIds, {
    full: true,
    ignoreMissing: true,
    enabled: hasPolicies,
  });
  const agentPolicies = useMemo(
    () => (policiesData?.items ?? []) as AgentPolicy[],
    [policiesData?.items]
  );

  const { agents, dataUpdatedAt, isTruncated } = useAgentsForPolicyIds(allPolicyIds, {
    refetchInterval: shouldPoll ? POLL_INTERVAL_MS : false,
  });
  // Remembers when an agent was first seen not running the integration, across polls.
  const notRunningSinceRef = useRef<NotRunningSince>({});

  const {
    summaryByInstanceId,
    packagePolicyByInstanceId,
    agentPolicyByInstanceId,
    dataSourceByInstanceId,
    dataInstances,
  } = useMemo(() => {
    const summaries: Record<string, InstanceAgentSummary> = {};
    const packagePolicies: Record<string, PackagePolicy | undefined> = {};
    const policiesByInstance: Record<string, AgentPolicy | undefined> = {};
    const dataSources: Record<string, InstanceDataSource> = {};
    const requestInstances: Record<string, DataRequestInstance> = {};
    // The moment the agents were last fetched is when this state was observed.
    const now = dataUpdatedAt || Date.now();
    const notRunningSince: NotRunningSince = {};

    for (const [instanceId, policyIds] of Object.entries(agentPolicyIdsByInstance)) {
      const packagePolicyId = policyIdsByInstance[instanceId];
      const applicable = getApplicableAgents(agents, policyIds);
      const selectedPolicies = agentPolicies.filter(({ id }) => policyIds.includes(id));
      const entry = awsServicesMap?.get(serviceIdByInstanceId[instanceId]);

      // Judge each agent against its own agent policy and the package policy this instance
      // deployed in it. Selected policies have independent revisions, so one policy's revision
      // says nothing about an agent on another.
      let assessments: AssessmentByAgentId = {};
      for (const agent of applicable) {
        const agentPolicy = findAgentPolicyForAgent(agent, selectedPolicies);
        const packagePolicy = findPackagePolicyInAgentPolicy(agentPolicy, packagePolicyId);
        if (agentPolicy && packagePolicy) {
          assessments[agent.id] = assessAgent({
            agent,
            agentPolicy,
            packageName: packagePolicy.package?.name ?? '',
            alertLevel: getComponentAlertLevel(agent, packagePolicy),
            units: getPackagePolicyUnitSummary(agent, packagePolicy),
          });
        }
      }
      const graced = applyNotRunningGrace({
        assessments,
        keyPrefix: instanceId,
        previousSince: notRunningSinceRef.current,
        now,
        graceMs: entry?.dataFormat === 'otel' ? OTEL_NOT_RUNNING_GRACE_MS : NOT_RUNNING_GRACE_MS,
      });
      assessments = graced.assessments;
      Object.assign(notRunningSince, graced.since);
      const fullSummary = summarizeInstanceAgents(applicable, assessments);
      // With the agent list capped, an agent that was left out may be unhealthy, so a healthy
      // verdict cannot be given. An unhealthy one stands: the agents seen are real.
      const summary: InstanceAgentSummary =
        isTruncated && fullSummary.health === 'healthy'
          ? { ...fullSummary, health: 'pending', unhealthyElsewhere: undefined, isIncomplete: true }
          : fullSummary;
      summaries[instanceId] = summary;

      // The flyout shows the policy of the agent the badge represents. With no agent yet, fall back
      // to the first selected policy that carries the package policy.
      const policyWithPackage = selectedPolicies.find(
        (policy) => !!findPackagePolicyInAgentPolicy(policy, packagePolicyId)
      );
      const agentPolicy =
        (summary.agent && findAgentPolicyForAgent(summary.agent, selectedPolicies)) ||
        policyWithPackage;
      const packagePolicy =
        findPackagePolicyInAgentPolicy(agentPolicy, packagePolicyId) ??
        findPackagePolicyInAgentPolicy(policyWithPackage, packagePolicyId);
      packagePolicies[instanceId] = packagePolicy;
      policiesByInstance[instanceId] = agentPolicy;

      const isOtel = entry?.dataFormat === 'otel';
      const dataSource: InstanceDataSource = usesAgentDataApi({ isOtel, agentPolicy })
        ? 'agent'
        : 'patterns';
      dataSources[instanceId] = dataSource;

      // Only agents running a live unit of the integration can have produced data that is its own;
      // another agent may be reporting data from an older integration of the same package.
      const packageVersion = packagePolicy?.package?.version;
      if (dataSource === 'agent' && entry && packageVersion && summary.liveAgentIds.length > 0) {
        requestInstances[instanceId] = {
          agentIds: summary.liveAgentIds,
          packageName: entry.packageName,
          packageVersion,
          isOtel,
        };
      }
    }

    notRunningSinceRef.current = notRunningSince;

    return {
      summaryByInstanceId: summaries,
      packagePolicyByInstanceId: packagePolicies,
      agentPolicyByInstanceId: policiesByInstance,
      dataSourceByInstanceId: dataSources,
      dataInstances: requestInstances,
    };
  }, [
    dataUpdatedAt,
    isTruncated,
    agentPolicyIdsByInstance,
    agents,
    agentPolicies,
    policyIdsByInstance,
    awsServicesMap,
    serviceIdByInstanceId,
  ]);

  const dataRequests = useMemo(
    () => buildIncomingDataRequests(Object.values(dataInstances)),
    [dataInstances]
  );
  const { data: agentIdsWithDataByKey } = useQuery<Record<string, string[]>>({
    queryKey: ['ingest_hub', 'agent_incoming_data', dataRequests],
    queryFn: async () => {
      const entries = await Promise.all(
        dataRequests.map(async ({ key, pkgName, pkgVersion, agentIds }) => {
          // A request covers every instance of the package, and each instance needs its own agents
          // answered, so every batch is asked about, not just until one has data.
          const responses = await Promise.all(
            toBatches(agentIds, AGENT_IDS_PER_REQUEST).map((batch) =>
              sendGetAgentIncomingData({ agentsIds: batch, pkgName, pkgVersion })
            )
          );
          const withData = responses.flatMap(({ data }) =>
            extractAgentIdsWithData(data?.items ?? [])
          );
          return [key, withData] as const;
        })
      );
      return Object.fromEntries(entries);
    },
    enabled: dataRequests.length > 0,
    refetchInterval: shouldPoll ? POLL_INTERVAL_MS : false,
  });

  const hasDataByInstanceId = useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const [instanceId, dataSource] of Object.entries(dataSourceByInstanceId)) {
      if (dataSource !== 'agent') continue;
      // No request means no live agent to ask about, which is no data yet.
      const instance = dataInstances[instanceId];
      result[instanceId] = !!instance && instanceHasData(instance, agentIdsWithDataByKey ?? {});
    }
    return result;
  }, [dataSourceByInstanceId, dataInstances, agentIdsWithDataByKey]);

  return {
    summaryByInstanceId,
    hasDataByInstanceId,
    dataSourceByInstanceId,
    packagePolicyByInstanceId,
    agentPolicyByInstanceId,
  };
}
