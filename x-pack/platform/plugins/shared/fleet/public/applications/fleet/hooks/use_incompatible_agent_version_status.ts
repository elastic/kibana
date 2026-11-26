/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { agentLosesPackageInputs, getAgentVersionBlockers } from '../../../../common/services';
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
       * version-specific policies, which drop the integration's inputs for those agents. When
       * false, the agent counts are omitted, as those agents don't lose any data.
       */
      requiresAcknowledgement: boolean;
    };

/**
 * On an upgrade from a package version with its own package-level agent version condition: that
 * condition, and the agent policies that already have the package policy. Their agents that don't
 * satisfy it already lack the integration's inputs, so they aren't counted, as Fleet does on save.
 */
export interface CurrentAgentVersionCondition {
  versionCondition: string;
  agentPolicyIds: readonly string[];
}

export const useIncompatibleAgentVersionStatus = (
  packageInfo: PackageInfo | undefined,
  agentPolicies: AgentPolicy[] | undefined,
  serverAgentVersionBlock?: AgentVersionBlock,
  currentCondition?: CurrentAgentVersionCondition
): IncompatibleAgentVersionResult => {
  return useMemo(() => {
    return getIncompatibleAgentVersionStatus(
      packageInfo,
      agentPolicies,
      serverAgentVersionBlock,
      currentCondition
    );
  }, [packageInfo, agentPolicies, serverAgentVersionBlock, currentCondition]);
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
  serverAgentVersionBlock?: AgentVersionBlock,
  currentCondition?: CurrentAgentVersionCondition
): IncompatibleAgentVersionResult => {
  const versionCondition = packageInfo?.conditions?.agent?.version;
  if (!versionCondition) {
    return { status: 'NONE' };
  }
  const agentPolicyCount = agentPolicies?.length ?? 0;
  const requiresAcknowledgement = ExperimentalFeaturesService.get().enableVersionSpecificPolicies;

  const agentVersionCounts = (agentPolicies ?? []).flatMap(
    ({ id, active_agents_per_version: activeAgentsPerVersion }) =>
      (activeAgentsPerVersion ?? []).map((versionCount) => ({
        ...versionCount,
        // Without version-specific policies, every agent receives the inputs whatever the condition
        lacksInputsAlready:
          requiresAcknowledgement &&
          !!currentCondition?.agentPolicyIds.includes(id) &&
          agentLosesPackageInputs(versionCount.version, currentCondition.versionCondition),
      }))
  );
  const { blockedCount, blockingVersions, minVersion } = getAgentVersionBlockers({
    versionCondition,
    agentVersionCounts: agentVersionCounts.filter(({ lacksInputsAlready }) => !lacksInputsAlready),
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
    // Without version-specific policies, the agents keep the integration's inputs: there is no
    // data loss to describe, only the incompatibility.
    ...(requiresAcknowledgement
      ? {
          blockedCount,
          observedVersions: blockingVersions,
          ...(minVersion ? { minVersion } : {}),
        }
      : {}),
    agentPolicyCount,
    requiresAcknowledgement,
  };
};
