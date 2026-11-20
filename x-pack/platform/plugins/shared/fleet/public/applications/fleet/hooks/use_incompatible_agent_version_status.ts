/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { getAgentVersionBlockers } from '../../../../common/services';
import type { AgentPolicy } from '../types';
import type { PackageInfo } from '../../../../common/types';

export type IncompatibleAgentVersionResult =
  | { status: 'NONE' }
  | {
      status: 'SOME' | 'ALL';
      versionCondition: string;
      /** Number of active agents that don't satisfy the condition. */
      blockedCount: number;
      /** Versions reported by those agents. */
      observedVersions: string[];
      /** Lowest version satisfying the condition, when every blocked agent runs below it. */
      minVersion?: string;
      /** Number of agent policies that were checked. */
      agentPolicyCount: number;
    };

export const useIncompatibleAgentVersionStatus = (
  packageInfo: PackageInfo | undefined,
  agentPolicies: AgentPolicy[] | undefined
): IncompatibleAgentVersionResult => {
  return useMemo(() => {
    return getIncompatibleAgentVersionStatus(packageInfo, agentPolicies);
  }, [packageInfo, agentPolicies]);
};

/**
 * Whether the active agents of `agentPolicies` satisfy the package-level agent version condition of
 * `packageInfo`, evaluated the same way as Fleet's server-side check.
 */
export const getIncompatibleAgentVersionStatus = (
  packageInfo: PackageInfo | undefined,
  agentPolicies: AgentPolicy[] | undefined
): IncompatibleAgentVersionResult => {
  const versionCondition = packageInfo?.conditions?.agent?.version;
  if (!versionCondition) {
    return { status: 'NONE' };
  }

  const agentVersionCounts = (agentPolicies ?? []).flatMap(
    ({ active_agents_per_version: activeAgentsPerVersion }) => activeAgentsPerVersion ?? []
  );
  const { blockedCount, blockingVersions, minVersion } = getAgentVersionBlockers({
    versionCondition,
    agentVersionCounts,
  });
  if (blockedCount === 0) {
    return { status: 'NONE' };
  }

  const agentCount = agentVersionCounts.reduce((total, { count }) => total + count, 0);
  return {
    status: blockedCount >= agentCount ? 'ALL' : 'SOME',
    versionCondition,
    blockedCount,
    observedVersions: blockingVersions,
    ...(minVersion ? { minVersion } : {}),
    agentPolicyCount: agentPolicies?.length ?? 0,
  };
};
