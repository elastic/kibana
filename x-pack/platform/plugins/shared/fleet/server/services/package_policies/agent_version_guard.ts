/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { chunk } from 'lodash';

import { AGENT_TYPE_OPAMP, AGENTS_INDEX } from '../../../common/constants';
import { agentLosesPackageInputs, getAgentVersionBlockers } from '../../../common/services';
import type { AgentVersionBlock, PackageInfo } from '../../../common/types';
import { PackagePolicyAgentVersionIncompatibleError } from '../../errors';
import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';
import { getPackageInfo } from '../epm/packages';
import { getVariantPolicyIdsForParents } from '../utils/version_specific_policies';

const MAX_AGENT_VERSIONS = 1000;
const AGENT_POLICIES_PER_QUERY = 50;
const MAX_VERSIONS_IN_MESSAGE = 10;

export type AgentVersionGuardOperation = 'upgrade' | 'add';

export interface AgentVersionGuardItem {
  /** Identifies the item in the returned map. */
  key: string;
  /** The package version the package policy would be on. */
  pkgInfo: Pick<PackageInfo, 'name' | 'version' | 'conditions'>;
  /** The agent policies whose agents would receive the package policy. */
  agentPolicyIds: readonly string[];
  /**
   * For an upgrade from a package version with its own package-level agent version condition: that
   * condition, and the agent policies that already receive the package policy. Their agents that
   * don't satisfy it already lack the integration's inputs, so the upgrade takes nothing from them.
   */
  currentCondition?: {
    versionCondition: string;
    agentPolicyIds: readonly string[];
  };
}

interface AgentVersionAggregation {
  buckets: Record<string, { versions?: { buckets: Array<{ key: string; doc_count: number }> } }>;
}

/**
 * The agents a package-level agent version condition applies to: active agents, including
 * offline-but-active ones, excluding OpAMP agents, which are never moved to version-specific
 * policies and so keep every input. Shared by the guard and the agent counts shown in the UI.
 *
 * Uses term and range queries on stored fields instead of the agent status runtime field, so that
 * it works with `search.allow_expensive_queries: false`:
 * - unenrolled: `active` is false
 * - uninstalled: `audit_unenrolled_reason` is `uninstall`
 * - unenrolling: `unenrollment_started_at` is set
 * - inactive: the last check-in, or the enrollment without one, is older than the agent policy's
 *   inactivity timeout
 */
export const buildAgentVersionConditionAgentsFilter = (
  inactivityTimeout?: number
): { filter: estypes.QueryDslQueryContainer[]; must_not: estypes.QueryDslQueryContainer[] } => {
  const inactiveSince = `now-${inactivityTimeout}s`;
  return {
    filter: [{ term: { active: true } }],
    must_not: [
      { term: { type: AGENT_TYPE_OPAMP } },
      { term: { audit_unenrolled_reason: 'uninstall' } },
      { exists: { field: 'unenrollment_started_at' } },
      ...(inactivityTimeout
        ? [
            { range: { last_checkin: { lt: inactiveSince } } },
            {
              bool: {
                filter: [{ range: { enrolled_at: { lt: inactiveSince } } }],
                must_not: [{ exists: { field: 'last_checkin' } }],
              },
            },
          ]
        : []),
    ],
  };
};

/**
 * The agents of an agent policy and its version-specific variants, without a wildcard: agents
 * carrying the policy's `policy_base_id`, and, as an older Fleet Server may not set that field,
 * agents without it on the policy or one of its known variants.
 */
const buildAgentsOfPolicyFilter = (
  agentPolicyId: string,
  variantPolicyIds: readonly string[]
): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [
      { term: { policy_base_id: agentPolicyId } },
      {
        bool: {
          filter: [{ terms: { policy_id: [agentPolicyId, ...variantPolicyIds] } }],
          must_not: [{ exists: { field: 'policy_base_id' } }],
        },
      },
    ],
    minimum_should_match: 1,
  },
});

/** The agents of an agent policy that a package-level agent version condition applies to. */
export const buildActiveAgentsOfPolicyFilter = (
  agentPolicyId: string,
  inactivityTimeout?: number,
  variantPolicyIds: readonly string[] = []
): estypes.QueryDslQueryContainer => {
  const { filter, must_not: mustNot } = buildAgentVersionConditionAgentsFilter(inactivityTimeout);
  return {
    bool: {
      filter: [buildAgentsOfPolicyFilter(agentPolicyId, variantPolicyIds), ...filter],
      must_not: mustNot,
    },
  };
};

/** Whether the guard needs the agents of `item`'s agent policies to check it. */
const needsAgentVersionCheck = ({ pkgInfo, agentPolicyIds }: AgentVersionGuardItem): boolean =>
  !!appContextService.getExperimentalFeatures().enableVersionSpecificPolicies &&
  !!pkgInfo.conditions?.agent?.version &&
  agentPolicyIds.length > 0;

/**
 * The package policies, among `items`, whose package-level `conditions.agent.version` some active
 * agents would not satisfy, so that version-specific policies would drop their inputs for those
 * agents. Queries the agents of up to 50 agent policies at a time.
 */
export async function getAgentVersionBlocks(
  items: readonly AgentVersionGuardItem[]
): Promise<Map<string, AgentVersionBlock>> {
  const blocks = new Map<string, AgentVersionBlock>();

  // Without version-specific policies, every agent receives every input.
  const itemsWithCondition = items.flatMap((item) => {
    const versionCondition = item.pkgInfo.conditions?.agent?.version;
    return versionCondition && needsAgentVersionCheck(item) ? [{ ...item, versionCondition }] : [];
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

  const inactivityTimeoutById = new Map(
    agentPolicies.map(({ id, inactivity_timeout: inactivityTimeout }) => [id, inactivityTimeout])
  );
  const buckets: AgentVersionAggregation['buckets'] = {};
  // Bounded chunks keep each query within Elasticsearch's clause and bucket limits
  for (const agentPolicyIdsChunk of chunk(guardedAgentPolicyIds, AGENT_POLICIES_PER_QUERY)) {
    const variantPolicyIdsByParent = await getVariantPolicyIdsForParents(
      esClient,
      agentPolicyIdsChunk
    );
    const filters = Object.fromEntries(
      agentPolicyIdsChunk.map((id) => [
        id,
        buildActiveAgentsOfPolicyFilter(
          id,
          inactivityTimeoutById.get(id),
          variantPolicyIdsByParent.get(id)
        ),
      ])
    );
    const { aggregations } = await esClient.search<unknown, { policies: AgentVersionAggregation }>({
      index: AGENTS_INDEX,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      query: { bool: { should: Object.values(filters), minimum_should_match: 1 } },
      aggs: {
        policies: {
          filters: { filters },
          aggs: { versions: { terms: { field: 'agent.version', size: MAX_AGENT_VERSIONS } } },
        },
      },
    });
    Object.assign(buckets, aggregations?.policies?.buckets);
  }

  for (const {
    key,
    pkgInfo,
    versionCondition,
    agentPolicyIds: itemAgentPolicyIds,
    currentCondition,
  } of itemsWithCondition) {
    const countByVersion = new Map<string, number>();
    for (const agentPolicyId of new Set(itemAgentPolicyIds)) {
      const lacksInputsAlready = (version: string) =>
        !!currentCondition?.agentPolicyIds.includes(agentPolicyId) &&
        agentLosesPackageInputs(version, currentCondition.versionCondition);
      for (const { key: version, doc_count: count } of buckets[agentPolicyId]?.versions?.buckets ??
        []) {
        if (!lacksInputsAlready(version)) {
          countByVersion.set(version, (countByVersion.get(version) ?? 0) + count);
        }
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
 * Same as {@link getAgentVersionBlocks}, but when the agents can't be queried, returns the error
 * for the items that needed them instead of throwing, so that callers handling several items can
 * fail only those.
 */
export async function getAgentVersionBlocksOrErrors(
  items: readonly AgentVersionGuardItem[]
): Promise<{
  blocks: Map<string, AgentVersionBlock>;
  errors: Map<string, Error>;
}> {
  try {
    return { blocks: await getAgentVersionBlocks(items), errors: new Map() };
  } catch (error) {
    return {
      blocks: new Map(),
      errors: new Map(items.filter(needsAgentVersionCheck).map(({ key }) => [key, error])),
    };
  }
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
    operation === 'upgrade'
      ? `Those agents would stop collecting this integration's data.`
      : `Those agents won't collect this integration's data.`,
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
  operation,
  ...item
}: Omit<AgentVersionGuardItem, 'key'> & {
  operation: AgentVersionGuardOperation;
}): Promise<void> {
  const block = (await getAgentVersionBlocks([{ key: 'item', ...item }])).get('item');
  if (block) {
    throw createAgentVersionIncompatibleError(block, operation);
  }
}

export type AgentVersionGuardScope = Pick<
  AgentVersionGuardItem,
  'agentPolicyIds' | 'currentCondition'
> & { operation: AgentVersionGuardOperation };

/**
 * Which agent policies an update of a package policy must be checked against, and how: all of
 * them when the package version changes, only the added ones when `policy_ids` grows, none
 * otherwise. Other edits stay unguarded. On an upgrade, agents on the agent policies that already
 * have the package policy are only checked if they satisfy `oldVersionCondition`, the condition of
 * the current package version, as the others already lack the inputs.
 */
export function getAgentVersionGuardScope({
  oldPackageVersion,
  newPackageVersion,
  oldPolicyIds,
  newPolicyIds,
  oldVersionCondition,
}: {
  oldPackageVersion?: string;
  newPackageVersion?: string;
  oldPolicyIds: readonly string[];
  newPolicyIds: readonly string[];
  oldVersionCondition?: string;
}): AgentVersionGuardScope | undefined {
  if (newPackageVersion && oldPackageVersion !== newPackageVersion) {
    return {
      agentPolicyIds: [...newPolicyIds],
      operation: 'upgrade',
      ...(oldVersionCondition
        ? {
            currentCondition: {
              versionCondition: oldVersionCondition,
              agentPolicyIds: newPolicyIds.filter((id) => oldPolicyIds.includes(id)),
            },
          }
        : {}),
    };
  }
  const addedPolicyIds = newPolicyIds.filter((id) => !oldPolicyIds.includes(id));
  if (addedPolicyIds.length) {
    return { agentPolicyIds: addedPolicyIds, operation: 'add' };
  }
  return undefined;
}

/**
 * The package-level agent version condition of `pkg`, the package version a package policy is
 * currently on. Returns `undefined` when there is none or the package can't be read, in which case
 * every agent is checked against the new version's condition.
 */
export async function getCurrentAgentVersionCondition(
  soClient: SavedObjectsClientContract,
  pkg?: { name: string; version: string }
): Promise<string | undefined> {
  if (!pkg) return undefined;
  try {
    const pkgInfo = await getPackageInfo({
      savedObjectsClient: soClient,
      pkgName: pkg.name,
      pkgVersion: pkg.version,
      prerelease: true,
    });
    return pkgInfo.conditions?.agent?.version;
  } catch (error) {
    appContextService
      .getLogger()
      .debug(
        `Could not read the agent version condition of ${pkg.name} ${pkg.version}: ${error.message}`
      );
    return undefined;
  }
}
