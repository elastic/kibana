/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import {
  AGENTS_PREFIX,
  buildPolicyBaseIdsWithFallbackKuery,
  type Agent,
  type AgentPolicy,
  type PackagePolicy,
} from '@kbn/fleet-plugin/common';
import {
  getComponentAlertLevel,
  getPackagePolicyUnitSummary,
  sendGetAgentIncomingData,
  useBulkGetAgentPoliciesQuery,
  useGetAgentsQuery,
} from '@kbn/fleet-plugin/public';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import {
  assessAgent,
  buildIncomingDataRequests,
  getAgentPolicyIdsByInstance,
  getApplicableAgents,
  instanceHasData,
  summarizeInstanceAgents,
  type AssessmentByAgentId,
  type DataRequestInstance,
  type InstanceAgentSummary,
} from './agent_detection';

const POLL_INTERVAL_MS = 10_000;
// Agents per deployment are bounded by the selected policies; this only guards the page size.
const MAX_AGENTS = 1000;

export interface AgentDetectionResult {
  /** Instances backed by a Fleet agent. ECF instances are absent and keep pattern detection. */
  summaryByInstanceId: Record<string, InstanceAgentSummary>;
  hasDataByInstanceId: Record<string, boolean>;
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

const findPackagePolicy = (
  agentPolicies: AgentPolicy[],
  agentPolicyIds: string[],
  packagePolicyId: string
): { agentPolicy?: AgentPolicy; packagePolicy?: PackagePolicy } => {
  for (const agentPolicy of agentPolicies) {
    if (!agentPolicyIds.includes(agentPolicy.id)) continue;
    const packagePolicy = (agentPolicy.package_policies as PackagePolicy[] | undefined)?.find(
      ({ id }) => id === packagePolicyId
    );
    if (packagePolicy) return { agentPolicy, packagePolicy };
  }
  return {};
};

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

  const agentsKuery = useMemo(
    () =>
      buildPolicyBaseIdsWithFallbackKuery(
        allPolicyIds,
        `${AGENTS_PREFIX}.policy_base_id`,
        `${AGENTS_PREFIX}.policy_id`
      ),
    [allPolicyIds]
  );
  const { data: agentsData } = useGetAgentsQuery(
    { kuery: agentsKuery, perPage: MAX_AGENTS },
    { enabled: hasPolicies, refetchInterval: shouldPoll ? POLL_INTERVAL_MS : false }
  );
  const agents = useMemo(() => (agentsData?.data?.items ?? []) as Agent[], [agentsData]);

  const { summaryByInstanceId, packagePolicyByInstanceId, agentPolicyByInstanceId, dataInstances } =
    useMemo(() => {
      const summaries: Record<string, InstanceAgentSummary> = {};
      const packagePolicies: Record<string, PackagePolicy | undefined> = {};
      const policiesByInstance: Record<string, AgentPolicy | undefined> = {};
      const requestInstances: Record<string, DataRequestInstance> = {};

      for (const [instanceId, policyIds] of Object.entries(agentPolicyIdsByInstance)) {
        const applicable = getApplicableAgents(agents, policyIds);
        const { agentPolicy, packagePolicy } = findPackagePolicy(
          agentPolicies,
          policyIds,
          policyIdsByInstance[instanceId]
        );
        packagePolicies[instanceId] = packagePolicy;
        policiesByInstance[instanceId] = agentPolicy;

        // Judge each agent by the package policy this instance deployed, not by the agent alone.
        const assessments: AssessmentByAgentId = {};
        if (packagePolicy && agentPolicy) {
          for (const agent of applicable) {
            assessments[agent.id] = assessAgent({
              agent,
              agentPolicy,
              packageName: packagePolicy.package?.name ?? '',
              alertLevel: getComponentAlertLevel(agent, packagePolicy),
              units: getPackagePolicyUnitSummary(agent, packagePolicy),
            });
          }
        }
        const summary = summarizeInstanceAgents(applicable, assessments);
        summaries[instanceId] = summary;

        const entry = awsServicesMap?.get(serviceIdByInstanceId[instanceId]);
        const packageVersion = packagePolicy?.package?.version;
        if (entry && packageVersion && summary.agentIds.length > 0) {
          requestInstances[instanceId] = {
            agentIds: summary.agentIds,
            packageName: entry.packageName,
            packageVersion,
            isOtel: entry.dataFormat === 'otel',
          };
        }
      }

      return {
        summaryByInstanceId: summaries,
        packagePolicyByInstanceId: packagePolicies,
        agentPolicyByInstanceId: policiesByInstance,
        dataInstances: requestInstances,
      };
    }, [
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
          const { data } = await sendGetAgentIncomingData({
            agentsIds: agentIds,
            pkgName,
            pkgVersion,
          });
          const withData = (data?.items ?? []).flatMap((item) =>
            Object.entries(item)
              .filter(([, { data: hasData }]) => hasData)
              .map(([agentId]) => agentId)
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
    for (const [instanceId, instance] of Object.entries(dataInstances)) {
      result[instanceId] = instanceHasData(instance, agentIdsWithDataByKey ?? {});
    }
    return result;
  }, [dataInstances, agentIdsWithDataByKey]);

  return {
    summaryByInstanceId,
    hasDataByInstanceId,
    packagePolicyByInstanceId,
    agentPolicyByInstanceId,
  };
}
