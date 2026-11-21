/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

import { NOT_OPAMP_AGENT_KUERY } from '../../../common/constants';
import { AgentStatusKueryHelper, getAgentVersionBlockers } from '../../../common/services';
import { buildPolicyIdOrVariantsKuery } from '../../../common/services/version_specific_policies_utils';
import type { AgentVersionBlock, PackageInfo } from '../../../common/types';
import { PackagePolicyAgentVersionIncompatibleError } from '../../errors';
import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';
import { getAgentsByKuery } from '../agents';

/**
 * The agents a package-level agent version condition applies to: active agents, including
 * offline-but-active ones, excluding OpAMP agents, which are never moved to version-specific
 * policies and so keep every input.
 */
export const AGENT_VERSION_CONDITION_AGENTS_KUERY = `${AgentStatusKueryHelper.buildKueryForActiveAgents()} and ${NOT_OPAMP_AGENT_KUERY}`;

const MAX_AGENT_VERSIONS = 1000;
const MAX_VERSIONS_IN_MESSAGE = 10;

export type AgentVersionGuardOperation = 'upgrade' | 'add';

export interface AgentVersionGuardItem {
  /** Identifies the item in the returned map. */
  key: string;
  /** The package version the package policy would be on. */
  pkgInfo: Pick<PackageInfo, 'name' | 'version' | 'conditions'>;
  /** The agent policies whose agents would receive the package policy. */
  agentPolicyIds: readonly string[];
}

interface AgentVersionAggregation {
  buckets: Record<string, { versions?: { buckets: Array<{ key: string; doc_count: number }> } }>;
}

/**
 * The package policies, among `items`, whose package-level `conditions.agent.version` some active
 * agents would not satisfy, so that version-specific policies would drop their inputs for those
 * agents. Uses a single agent query for all items.
 */
export async function getAgentVersionBlocks(
  items: readonly AgentVersionGuardItem[]
): Promise<Map<string, AgentVersionBlock>> {
  const blocks = new Map<string, AgentVersionBlock>();

  // Without version-specific policies, every agent receives every input.
  if (!appContextService.getExperimentalFeatures().enableVersionSpecificPolicies) {
    return blocks;
  }

  const itemsWithCondition = items.flatMap((item) => {
    const versionCondition = item.pkgInfo.conditions?.agent?.version;
    return versionCondition && item.agentPolicyIds.length ? [{ ...item, versionCondition }] : [];
  });
  if (!itemsWithCondition.length) {
    return blocks;
  }

  // Agent policy ids are unique across spaces, and every agent on an agent policy receives its
  // package policies whatever space the request comes from, so the lookup is not space-scoped.
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const esClient = appContextService.getInternalUserESClient();

  const agentPolicyIds = [...new Set(itemsWithCondition.flatMap((item) => item.agentPolicyIds))];
  const agentPolicies = await agentPolicyService.getByIds(
    soClient,
    agentPolicyIds.map((id) => ({ id, spaceId: '*' })),
    { ignoreMissing: true }
  );
  // Agentless agents are deployed on the stack-aligned version and are not subject to the guard.
  const agentlessPolicyIds = new Set(
    agentPolicies.filter(({ supports_agentless: agentless }) => agentless).map(({ id }) => id)
  );
  const guardedAgentPolicyIds = agentPolicyIds.filter((id) => !agentlessPolicyIds.has(id));
  if (!guardedAgentPolicyIds.length) {
    return blocks;
  }

  const policyKueryById = new Map(
    guardedAgentPolicyIds.map((id) => [id, buildPolicyIdOrVariantsKuery(id)])
  );
  let aggregations: Awaited<ReturnType<typeof getAgentsByKuery>>['aggregations'];
  try {
    ({ aggregations } = await getAgentsByKuery(esClient, soClient, {
      showInactive: false,
      perPage: 0,
      kuery: `(${[...policyKueryById.values()].join(
        ' or '
      )}) and ${AGENT_VERSION_CONDITION_AGENTS_KUERY}`,
      aggregations: {
        policies: {
          filters: {
            filters: Object.fromEntries(
              [...policyKueryById].map(([id, kuery]) => [
                id,
                toElasticsearchQuery(fromKueryExpression(kuery)),
              ])
            ),
          },
          aggs: { versions: { terms: { field: 'agent.version', size: MAX_AGENT_VERSIONS } } },
        },
      },
    }));
  } catch (error) {
    // The guard is a safety net: when agents can't be queried (e.g. with
    // `search.allow_expensive_queries: false`, which rejects the agent status runtime field and the
    // version-specific policy wildcard), don't fail writes that are otherwise valid.
    appContextService
      .getLogger()
      .warn(
        `Skipped the agent version check of ${itemsWithCondition
          .map(({ pkgInfo }) => `${pkgInfo.name}@${pkgInfo.version}`)
          .join(', ')}: failed to query agents: ${error.message}`
      );
    return blocks;
  }
  const buckets = (aggregations?.policies as AgentVersionAggregation | undefined)?.buckets ?? {};

  for (const {
    key,
    pkgInfo,
    versionCondition,
    agentPolicyIds: itemAgentPolicyIds,
  } of itemsWithCondition) {
    const countByVersion = new Map<string, number>();
    for (const agentPolicyId of new Set(itemAgentPolicyIds)) {
      for (const { key: version, doc_count: count } of buckets[agentPolicyId]?.versions?.buckets ??
        []) {
        countByVersion.set(version, (countByVersion.get(version) ?? 0) + count);
      }
    }

    const { blockedCount, blockingVersions, minVersion } = getAgentVersionBlockers({
      versionCondition,
      agentVersionCounts: [...countByVersion].map(([version, count]) => ({ version, count })),
    });
    if (blockedCount > 0) {
      blocks.set(key, {
        package_name: pkgInfo.name,
        package_version: pkgInfo.version,
        version_condition: versionCondition,
        blocked_count: blockedCount,
        observed_versions: blockingVersions,
        ...(minVersion ? { min_version: minVersion } : {}),
      });
    }
  }

  return blocks;
}

/**
 * The message explaining an {@link AgentVersionBlock}: the condition, the package version, the
 * number of agents that don't satisfy it and their versions.
 */
export function getAgentVersionBlockMessage(
  block: AgentVersionBlock,
  operation: AgentVersionGuardOperation
): string {
  const {
    package_name: pkgName,
    package_version: pkgVersion,
    version_condition: versionCondition,
    blocked_count: blockedCount,
    observed_versions: observedVersions,
    min_version: minVersion,
  } = block;

  const target =
    operation === 'upgrade'
      ? `upgrade ${pkgName} to ${pkgVersion}`
      : `add ${pkgName} ${pkgVersion} to the selected agent policies`;

  let agents = "some active agents don't";
  if (blockedCount !== undefined && observedVersions?.length) {
    const shownVersions = observedVersions.slice(0, MAX_VERSIONS_IN_MESSAGE).join(', ');
    const hiddenVersions = observedVersions.length - MAX_VERSIONS_IN_MESSAGE;
    const versions =
      hiddenVersions > 0 ? `${shownVersions} and ${hiddenVersions} more` : shownVersions;
    agents =
      blockedCount === 1
        ? `1 active agent on ${versions} doesn't`
        : `${blockedCount} active agents on ${versions} don't`;
  }

  return [
    `Cannot ${target}: it requires agent version ${versionCondition}, and ${agents} satisfy it.`,
    `Those agents would stop collecting this integration's data.`,
    ...(minVersion
      ? [`Upgrade the agents to a version that satisfies it, such as ${minVersion}.`]
      : []),
    `To proceed anyway, set acknowledge_agent_version_incompatibility to true.`,
  ].join(' ');
}

/** The error rejecting a change blocked by an {@link AgentVersionBlock}. */
export function createAgentVersionIncompatibleError(
  block: AgentVersionBlock,
  operation: AgentVersionGuardOperation
): PackagePolicyAgentVersionIncompatibleError {
  return new PackagePolicyAgentVersionIncompatibleError(
    getAgentVersionBlockMessage(block, operation),
    block,
    operation
  );
}

/**
 * The {@link AgentVersionBlock} without the agent inventory (agent count, versions and the
 * upgrade target derived from them), for callers that can't read agents.
 */
export function redactAgentVersionBlock({
  package_name: packageName,
  package_version: packageVersion,
  version_condition: versionCondition,
}: AgentVersionBlock): AgentVersionBlock {
  return {
    package_name: packageName,
    package_version: packageVersion,
    version_condition: versionCondition,
  };
}

/**
 * `error` without the agent inventory when it is a
 * {@link PackagePolicyAgentVersionIncompatibleError}, `error` itself otherwise.
 */
export function redactAgentVersionIncompatibleError<T>(
  error: T
): T | PackagePolicyAgentVersionIncompatibleError {
  return error instanceof PackagePolicyAgentVersionIncompatibleError
    ? createAgentVersionIncompatibleError(
        redactAgentVersionBlock(error.agentVersionBlock),
        error.operation
      )
    : error;
}

/**
 * Throws a {@link PackagePolicyAgentVersionIncompatibleError} when some active agents on
 * `agentPolicyIds` don't satisfy the package-level agent version condition of `pkgInfo`.
 */
export async function assertAgentVersionCompatible({
  pkgInfo,
  agentPolicyIds,
  operation,
}: {
  pkgInfo: AgentVersionGuardItem['pkgInfo'];
  agentPolicyIds: readonly string[];
  operation: AgentVersionGuardOperation;
}): Promise<void> {
  const block = (await getAgentVersionBlocks([{ key: 'item', pkgInfo, agentPolicyIds }])).get(
    'item'
  );
  if (block) {
    throw createAgentVersionIncompatibleError(block, operation);
  }
}

/**
 * Which agent policies an update of a package policy must be checked against, and how: all of
 * them when the package version changes, only the added ones when `policy_ids` grows, none
 * otherwise. Other edits stay unguarded.
 */
export function getAgentVersionGuardScope({
  oldPackageVersion,
  newPackageVersion,
  oldPolicyIds,
  newPolicyIds,
}: {
  oldPackageVersion?: string;
  newPackageVersion?: string;
  oldPolicyIds: readonly string[];
  newPolicyIds: readonly string[];
}): { agentPolicyIds: string[]; operation: AgentVersionGuardOperation } | undefined {
  if (newPackageVersion && oldPackageVersion !== newPackageVersion) {
    return { agentPolicyIds: [...newPolicyIds], operation: 'upgrade' };
  }
  const addedPolicyIds = newPolicyIds.filter((id) => !oldPolicyIds.includes(id));
  if (addedPolicyIds.length) {
    return { agentPolicyIds: addedPolicyIds, operation: 'add' };
  }
  return undefined;
}
