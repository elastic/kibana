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

/**
 * An agent of an instance, with the instance package policy it runs, if one was found. Without an
 * agent, it stands for a managed integration whose agentless agent is not enrolled yet (Pending).
 */
export interface OnboardingInstanceAgent {
  agent?: Agent;
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
export function useOnboardingInstancesAgents(
  onboardingInstances: CloudOnboardingDeploymentListItem[],
  { enabled }: { enabled: boolean }
) {
  const packagePolicyIds = useMemo(
    () => [
      ...new Set(
        onboardingInstances.flatMap(
          (onboardingInstance) => onboardingInstance.packagePolicyIds ?? []
        )
      ),
    ],
    [onboardingInstances]
  );
  const {
    data: packagePoliciesData,
    isInitialLoading: isPackagePoliciesLoading,
    error: packagePoliciesError,
  } = useQuery<BulkGetPackagePoliciesResponse, Error>(
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

  const policiesByOnboardingInstance = useMemo(() => {
    const packagePolicyById = new Map(
      (packagePoliciesData?.items ?? []).map((policy) => [policy.id, policy])
    );
    return new Map(
      onboardingInstances.map((onboardingInstance) => {
        const packagePolicies = (onboardingInstance.packagePolicyIds ?? []).flatMap((id) => {
          const policy = packagePolicyById.get(id);
          return policy ? [policy] : [];
        });
        const agentPolicyIds = [
          ...new Set([
            ...(onboardingInstance.agentPolicyIds ?? []),
            ...packagePolicies.flatMap((policy) => policy.policy_ids),
          ]),
        ];
        return [onboardingInstance.id, { packagePolicies, agentPolicyIds }];
      })
    );
  }, [onboardingInstances, packagePoliciesData]);

  const allAgentPolicyIds = useMemo(
    () => [...new Set([...policiesByOnboardingInstance.values()].flatMap((p) => p.agentPolicyIds))],
    [policiesByOnboardingInstance]
  );
  // Waits for the package policies, so the agentless agent policies are part of the first query.
  const {
    agents,
    isTruncated,
    isLoading: isAgentsLoading,
    error: agentsError,
  } = useAgentsForPolicyIds(allAgentPolicyIds, {
    enabled: enabled && !isPackagePoliciesLoading,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const agentsByOnboardingInstance = useMemo(() => {
    const byOnboardingInstance = new Map<string, OnboardingInstanceAgent[]>();
    for (const agent of agents) {
      if (!agent.policy_id) continue;
      const agentPolicyId = removeVersionSuffixFromPolicyId(agent.policy_id);
      for (const [
        onboardingInstanceId,
        { packagePolicies, agentPolicyIds },
      ] of policiesByOnboardingInstance) {
        if (!agentPolicyIds.includes(agentPolicyId)) continue;
        const packagePolicy = packagePolicies.find((policy) =>
          policy.policy_ids.includes(agentPolicyId)
        );
        byOnboardingInstance.set(onboardingInstanceId, [
          ...(byOnboardingInstance.get(onboardingInstanceId) ?? []),
          { agent, agentPolicyId, packagePolicy },
        ]);
      }
    }

    // A managed integration policy without its agentless agent is not deployed yet: Pending, as in
    // the managed integrations table. Only after a complete, successful agent lookup: while agents
    // load, when they were cut short or when the request failed, its agent may just be missing.
    if (!isAgentsLoading && !isTruncated && !agentsError) {
      for (const [onboardingInstanceId, { packagePolicies }] of policiesByOnboardingInstance) {
        const onboardingInstanceAgents = byOnboardingInstance.get(onboardingInstanceId) ?? [];
        for (const packagePolicy of packagePolicies) {
          // Agentless package policies have a single agent policy.
          const agentPolicyId = packagePolicy.policy_ids[0];
          if (
            !packagePolicy.supports_agentless ||
            !agentPolicyId ||
            onboardingInstanceAgents.some(
              (onboardingInstanceAgent) => onboardingInstanceAgent.agentPolicyId === agentPolicyId
            )
          ) {
            continue;
          }
          onboardingInstanceAgents.push({ agentPolicyId, packagePolicy });
        }
        if (onboardingInstanceAgents.length)
          byOnboardingInstance.set(onboardingInstanceId, onboardingInstanceAgents);
      }
    }
    return byOnboardingInstance;
  }, [agents, policiesByOnboardingInstance, isAgentsLoading, isTruncated, agentsError]);

  const agentPolicyIdsByOnboardingInstance = useMemo(
    () =>
      new Map(
        [...policiesByOnboardingInstance].map(([onboardingInstanceId, { agentPolicyIds }]) => [
          onboardingInstanceId,
          agentPolicyIds,
        ])
      ),
    [policiesByOnboardingInstance]
  );

  return {
    agentsByOnboardingInstance,
    agentPolicyIdsByOnboardingInstance,
    /** True when not every agent was fetched, so some instances may miss agents. */
    isTruncated,
    isLoading: enabled && (isPackagePoliciesLoading || isAgentsLoading),
    // Without the package policies, managed instances have no agent policies to query, so their
    // missing agents would look like no agents at all.
    error: packagePoliciesError ?? agentsError,
  };
}
