/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { getAgentVersionBlockers } from '../../../../common/services';
import type { AgentPolicy } from '../types';
import type { AgentVersionBlock, PackageInfo } from '../../../../common/types';
import { ExperimentalFeaturesService } from '../../../services';

export type IncompatibleAgentVersionResult =
  | { status: 'NONE' }
  | {
      status: 'SOME' | 'ALL';
      versionCondition: string;
      /** Number of active agents that don't satisfy the condition, when known. */
      blockedCount?: number;
      /** Versions reported by those agents, when known. */
      observedVersions?: string[];
      /** Lowest version satisfying the condition, when every blocked agent runs below it. */
      minVersion?: string;
      /** Number of agent policies that were checked. */
      agentPolicyCount: number;
      /**
       * Whether Fleet rejects the change until the incompatibility is acknowledged: only with
       * version-specific policies, which drop the integration's inputs for those agents.
       */
      requiresAcknowledgement: boolean;
    };

export const useIncompatibleAgentVersionStatus = (
  packageInfo: PackageInfo | undefined,
  agentPolicies: AgentPolicy[] | undefined,
  serverAgentVersionBlock?: AgentVersionBlock
): IncompatibleAgentVersionResult => {
  return useMemo(() => {
    return getIncompatibleAgentVersionStatus(packageInfo, agentPolicies, serverAgentVersionBlock);
  }, [packageInfo, agentPolicies, serverAgentVersionBlock]);
};

/**
 * Whether the active agents of `agentPolicies` satisfy the package-level agent version condition of
 * `packageInfo`, evaluated the same way as Fleet's server-side check. Falls back to
 * `serverAgentVersionBlock`, the block returned by Fleet when it rejected the change, when the
 * agent counts don't show the incompatibility: they are missing without the Agents Read privilege,
 * and can be stale.
 */
export const getIncompatibleAgentVersionStatus = (
  packageInfo: PackageInfo | undefined,
  agentPolicies: AgentPolicy[] | undefined,
  serverAgentVersionBlock?: AgentVersionBlock
): IncompatibleAgentVersionResult => {
  const versionCondition = packageInfo?.conditions?.agent?.version;
  if (!versionCondition) {
    return { status: 'NONE' };
  }
  const agentPolicyCount = agentPolicies?.length ?? 0;
  const requiresAcknowledgement = ExperimentalFeaturesService.get().enableVersionSpecificPolicies;

  const agentVersionCounts = (agentPolicies ?? []).flatMap(
    ({ active_agents_per_version: activeAgentsPerVersion }) => activeAgentsPerVersion ?? []
  );
  const { blockedCount, blockingVersions, minVersion } = getAgentVersionBlockers({
    versionCondition,
    agentVersionCounts,
  });
  if (blockedCount === 0) {
    return serverAgentVersionBlock
      ? {
          status: 'SOME',
          versionCondition: serverAgentVersionBlock.version_condition,
          blockedCount: serverAgentVersionBlock.blocked_count,
          observedVersions: serverAgentVersionBlock.observed_versions,
          ...(serverAgentVersionBlock.min_version
            ? { minVersion: serverAgentVersionBlock.min_version }
            : {}),
          agentPolicyCount,
          requiresAcknowledgement: true,
        }
      : { status: 'NONE' };
  }

  const agentCount = agentVersionCounts.reduce((total, { count }) => total + count, 0);
  return {
    status: blockedCount >= agentCount ? 'ALL' : 'SOME',
    versionCondition,
    blockedCount,
    observedVersions: blockingVersions,
    ...(minVersion ? { minVersion } : {}),
    agentPolicyCount,
    requiresAcknowledgement,
  };
};
