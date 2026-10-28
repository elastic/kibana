/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';

import type {
  Agent,
  BulkGetPackagePoliciesResponse,
  CloudOnboardingDeploymentListItem,
  PackagePolicy,
} from '../../../../../../../../common/types';
import { API_VERSIONS } from '../../../../../../../../common/constants';
import {
  packagePolicyRouteService,
  removeVersionSuffixFromPolicyId,
} from '../../../../../../../../common/services';
import { sendRequestForRq, useAgentsForPolicyIds } from '../../../../../../../hooks';

const REFRESH_INTERVAL_MS = 30000;

/** An agent of an instance, with the instance package policy it runs, if one was found. */
export interface InstanceAgent {
  agent: Agent;
  /** The agent policy the agent is enrolled in, without a version suffix. */
  agentPolicyId: string;
  packagePolicy?: PackagePolicy;
}

/**
 * The agents of each instance, and its agent policy ids, by instance id. Agents are polled every
 * 30 seconds. An instance's agents are
 * those enrolled in its agent policies: the agent-based ones it stores, and the agent policies of
 * its package policies (the agentless agent policies of managed integrations).
 */
export function useInstancesAgents(
  instances: CloudOnboardingDeploymentListItem[],
  { enabled }: { enabled: boolean }
) {
  const packagePolicyIds = useMemo(
    () => [...new Set(instances.flatMap((instance) => instance.packagePolicyIds ?? []))],
    [instances]
  );
  const { data: packagePoliciesData, isInitialLoading: isPackagePoliciesLoading } = useQuery(
    ['instances_package_policies', packagePolicyIds],
    () =>
      sendRequestForRq<BulkGetPackagePoliciesResponse>({
        path: packagePolicyRouteService.getBulkGetPath(),
        method: 'post',
        body: JSON.stringify({ ids: packagePolicyIds, ignoreMissing: true }),
        version: API_VERSIONS.public.v1,
      }),
    { enabled: enabled && packagePolicyIds.length > 0 }
  );

  const policiesByInstance = useMemo(() => {
    const packagePolicyById = new Map(
      (packagePoliciesData?.items ?? []).map((policy) => [policy.id, policy])
    );
    return new Map(
      instances.map((instance) => {
        const packagePolicies = (instance.packagePolicyIds ?? []).flatMap((id) => {
          const policy = packagePolicyById.get(id);
          return policy ? [policy] : [];
        });
        const agentPolicyIds = [
          ...new Set([
            ...(instance.agentPolicyIds ?? []),
            ...packagePolicies.flatMap((policy) => policy.policy_ids),
          ]),
        ];
        return [instance.id, { packagePolicies, agentPolicyIds }];
      })
    );
  }, [instances, packagePoliciesData]);

  const allAgentPolicyIds = useMemo(
    () => [...new Set([...policiesByInstance.values()].flatMap((p) => p.agentPolicyIds))],
    [policiesByInstance]
  );
  // Waits for the package policies, so the agentless agent policies are part of the first query.
  const {
    agents,
    isLoading: isAgentsLoading,
    error,
  } = useAgentsForPolicyIds(allAgentPolicyIds, {
    enabled: enabled && !isPackagePoliciesLoading,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const agentsByInstance = useMemo(() => {
    const byInstance = new Map<string, InstanceAgent[]>();
    for (const agent of agents) {
      if (!agent.policy_id) continue;
      const agentPolicyId = removeVersionSuffixFromPolicyId(agent.policy_id);
      for (const [instanceId, { packagePolicies, agentPolicyIds }] of policiesByInstance) {
        if (!agentPolicyIds.includes(agentPolicyId)) continue;
        const packagePolicy = packagePolicies.find((policy) =>
          policy.policy_ids.includes(agentPolicyId)
        );
        byInstance.set(instanceId, [
          ...(byInstance.get(instanceId) ?? []),
          { agent, agentPolicyId, packagePolicy },
        ]);
      }
    }
    return byInstance;
  }, [agents, policiesByInstance]);

  const agentPolicyIdsByInstance = useMemo(
    () =>
      new Map(
        [...policiesByInstance].map(([instanceId, { agentPolicyIds }]) => [
          instanceId,
          agentPolicyIds,
        ])
      ),
    [policiesByInstance]
  );

  return {
    agentsByInstance,
    agentPolicyIdsByInstance,
    isLoading: enabled && (isPackagePoliciesLoading || isAgentsLoading),
    error,
  };
}
