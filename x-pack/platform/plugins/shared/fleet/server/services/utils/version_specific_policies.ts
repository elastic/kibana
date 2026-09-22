/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coerce, satisfies } from 'semver';

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { escapeQuotes } from '@kbn/es-query';

import { appContextService } from '../app_context';
import { collectCompiledSecretRefIds } from '../secrets';
import * as AgentService from '../agents';
import type { FleetServerPolicy, FullAgentPolicy, FullAgentPolicyInput } from '../../types';
import type { SecretReference } from '../../../common/types';
import { agentPolicyService } from '../agent_policy';
import type { PackageInfo, PackagePolicyAssetsMap } from '../../../common/types';
import { AGENT_POLICY_INDEX, AGENT_POLICY_VERSION_SEPARATOR } from '../../../common/constants';
import { splitVersionSuffixFromPolicyId } from '../../../common/services/version_specific_policies_utils';

/** Field on `.fleet-agents` / `.fleet-policies` holding the canonical (suffix-stripped) policy id. */
const POLICY_BASE_ID_FIELD = 'policy_base_id';

/**
 * KQL matching agents assigned to a version-specific variant of the given base policy — but NOT the
 * base policy itself. Term-based on `policy_base_id` (no wildcard/prefix), so it stays compatible
 * with `search.allow_expensive_queries: false`.
 *
 * Mixed-version rollout note: an agent enrolled by a downlevel fleet-server after the last Kibana
 * startup backfill will have a versioned `policy_id` (e.g. `policy1#9.4`) but no `policy_base_id`
 * field. Such agents are NOT matched by this kuery. The orphan sweep may therefore delete the
 * variant `.fleet-policies` document before that agent is reassigned, leaving it pointing to a
 * missing policy until the next Kibana restart re-runs the startup backfill and recovers it. The
 * window is bounded by the time between the mixed-version enrollment and the next restart.
 */
export function buildVariantAgentsKuery(parentPolicyId: string): string {
  const escapedId = escapeQuotes(parentPolicyId);
  return `${POLICY_BASE_ID_FIELD}:"${escapedId}" and not policy_id:"${escapedId}"`;
}

export async function getAgentVersionsForVersionSpecificPolicies(): Promise<string[]> {
  const commonVersions = [];
  const kibanaVersion = appContextService.getKibanaVersion();
  const coercedKibanaVersion = coerce(kibanaVersion);
  if (coercedKibanaVersion) {
    // current major.minor
    commonVersions.push(`${coercedKibanaVersion.major}.${coercedKibanaVersion.minor}`);
    // previous minor
    if (coercedKibanaVersion.minor > 0) {
      commonVersions.push(`${coercedKibanaVersion.major}.${coercedKibanaVersion.minor - 1}`);
    }
    const availableVersions = await AgentService.getAvailableVersions();
    const previousMajorLatestMinor = availableVersions
      .sort((a, b) => b.localeCompare(a))
      .find((version) => version.startsWith(`${coercedKibanaVersion.major - 1}.`));
    // previous major's latest minor
    if (previousMajorLatestMinor) {
      const coercedPreviousMajorLatestMinor = coerce(previousMajorLatestMinor);
      if (coercedPreviousMajorLatestMinor) {
        commonVersions.push(
          `${coercedPreviousMajorLatestMinor.major}.${coercedPreviousMajorLatestMinor.minor}`
        );
      }
    }
  }
  appContextService
    .getLogger()
    .debug(`Common agent versions for version specific policies: ${commonVersions.join(', ')}`);
  return commonVersions;
}

function getInputsForVersion(inputs: FullAgentPolicyInput[], ver: string) {
  return inputs.filter((input) => {
    return (
      !input.meta?.package?.agentVersion || satisfies(coerce(ver)!, input.meta.package.agentVersion)
    );
  });
}

export async function getVersionSpecificPolicies(
  soClient: SavedObjectsClientContract,
  fleetServerPolicy: FleetServerPolicy,
  fullPolicy: FullAgentPolicy,
  agentVersions?: string[]
): Promise<FleetServerPolicy[]> {
  const fleetServerPolicies: FleetServerPolicy[] = [];

  for (const version of agentVersions ?? (await getAgentVersionsForVersionSpecificPolicies())) {
    let updatedFullPolicy: FullAgentPolicy | null = null;

    // if some of the inputs have template level conditions, we have to recreate the full agent policy with agent version
    if (fullPolicy.inputs.some((input) => !input.meta?.package?.agentVersion)) {
      // read compiled template for agent version from package policy SO
      updatedFullPolicy = await agentPolicyService.getFullAgentPolicy(soClient, fullPolicy.id, {
        agentVersion: version,
      });
    }
    const versionedPolicyId = `${fullPolicy.id}${AGENT_POLICY_VERSION_SEPARATOR}${version}`;
    const versionSpecificPolicy: FleetServerPolicy = {
      ...fleetServerPolicy,
      policy_id: versionedPolicyId,
      policy_base_id: fullPolicy.id,
      data: {
        ...fleetServerPolicy.data,
        // The agent reports the policy id from `data.id` on checkin, so it must carry the
        // version suffix too. Otherwise the agent reports the base id, fleet-server sees a
        // mismatch against the versioned `agent.policy_id`, and the agent churns on
        // POLICY_CHANGE actions every checkin. See https://github.com/elastic/kibana/issues/276294
        id: versionedPolicyId,
        inputs: getInputsForVersion(updatedFullPolicy?.inputs ?? fullPolicy.inputs, version),
        // Remove refs for inputs that getInputsForVersion strips from this variant. Only scan the
        // stripped inputs: output/fleet-server-host/download-source secrets live outside `inputs`
        // (in data.outputs, data.fleet, etc.) and have no $co.elastic.secret{X} placeholder there,
        // so scanning all refs against versionedInputs would incorrectly drop them.
        secret_references: (() => {
          const sourceInputs = updatedFullPolicy?.inputs ?? fullPolicy.inputs;
          const versionedInputs = getInputsForVersion(sourceInputs, version);
          const strippedInputs = sourceInputs.filter((inp) => !versionedInputs.includes(inp));
          const strippedIds = collectCompiledSecretRefIds(strippedInputs);
          // A secret placeholder can appear in both a stripped input and a retained input (e.g. one
          // var compiles into two inputs with different agentVersion gates). Only remove an id when
          // it appears in stripped inputs AND is absent from the retained inputs.
          const versionedIds = collectCompiledSecretRefIds(versionedInputs);
          const refs: SecretReference[] =
            updatedFullPolicy?.secret_references ??
            (fleetServerPolicy.data?.secret_references as SecretReference[] | undefined) ??
            [];
          return strippedIds
            ? refs.filter(({ id: refId }) => !strippedIds.has(refId) || !!versionedIds?.has(refId))
            : refs;
        })(),
      },
    };
    fleetServerPolicies.push(versionSpecificPolicy);
  }

  return fleetServerPolicies;
}

/**
 * Reassign any agents still on a version-specific variant policy (`<parentId>#<version>`) of a
 * parent that no longer requires them back to the base policy, so they keep syncing.
 *
 * Without this, removing the integration/input that required version-specific policies leaves
 * agents assigned to a variant policy that is never updated again, so they get stuck reporting an
 * outdated policy. See https://github.com/elastic/kibana/issues/276294
 *
 * This is the inline fast path invoked from the agent policy update, and is scoped to the caller's
 * space via `soClient`. It intentionally does NOT delete the variant `.fleet-policies` documents:
 * deletion is global (across spaces) and owned by the periodic sweep, which first reassigns agents
 * across every space. Deleting here would strand agents in other spaces that still reference the
 * variant document until the next sweep run.
 */
export async function reassignAgentsFromVersionSpecificPolicies(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  parentPolicyId: string
): Promise<void> {
  const logger = appContextService.getLogger();
  const variantKuery = buildVariantAgentsKuery(parentPolicyId);

  const { total } = await AgentService.getAgentsByKuery(esClient, soClient, {
    kuery: variantKuery,
    showInactive: false,
    perPage: 0,
  });
  if (total === 0) {
    return;
  }
  logger.info(
    `Reassigning ${total} agents from version-specific policies of ${parentPolicyId} back to the base policy`
  );
  await AgentService.reassignAgents(
    soClient,
    esClient,
    { kuery: variantKuery, showInactive: false },
    parentPolicyId
  );
}

/**
 * Delete the version-specific (`<parentId>#<version>`) documents for a parent agent policy from
 * the `.fleet-policies` index. Used when a policy no longer requires version-specific policies so
 * the now-stale variant documents don't linger.
 */
export async function deleteVersionSpecificFleetServerPolicies(
  esClient: ElasticsearchClient,
  parentPolicyId: string
): Promise<void> {
  await esClient.deleteByQuery({
    index: AGENT_POLICY_INDEX,
    ignore_unavailable: true,
    // Match only the variant documents: `policy_base_id` is the base id for both the base and its
    // variants, so exclude the base document by `must_not policy_id: parentPolicyId`. Term-based
    // (no `prefix`), so it works with `search.allow_expensive_queries: false`. Every `.fleet-policies`
    // document carries `policy_base_id` (written on deploy and backfilled at startup).
    query: {
      bool: {
        filter: [{ term: { [POLICY_BASE_ID_FIELD]: parentPolicyId } }],
        must_not: [{ term: { policy_id: parentPolicyId } }],
      },
    },
    // Cleanup only; no reader needs the deletion visible synchronously, so avoid forcing a refresh.
    refresh: false,
  });
}

/**
 * Delete specific version-specific variant `.fleet-policies` documents identified by their full
 * `policy_id` (e.g. `"<parentId>#9.4"`). Only deletes documents written before `writtenBefore`,
 * which is enforced atomically inside the `deleteByQuery` itself so any racing deploy that stamps a
 * fresh `@timestamp` is excluded without a TOCTOU window.
 */
export async function deleteVersionSpecificFleetServerPoliciesForVersions(
  esClient: ElasticsearchClient,
  variantPolicyIds: string[],
  { writtenBefore }: { writtenBefore: string }
): Promise<void> {
  if (variantPolicyIds.length === 0) {
    return;
  }
  await esClient.deleteByQuery({
    index: AGENT_POLICY_INDEX,
    ignore_unavailable: true,
    query: {
      bool: {
        filter: [
          { terms: { policy_id: variantPolicyIds } },
          { range: { '@timestamp': { lt: writtenBefore } } },
        ],
      },
    },
    refresh: false,
  });
}

/**
 * Returns the set of agent minor versions (e.g. `"9.4"`) currently assigned to variant policies
 * for the given parent agent policy ids, keyed by parent id.
 *
 * Two-step approach, mirroring the sweep path so both paths are consistent:
 *   1. Query `.fleet-policies` (by `policy_base_id`) to enumerate the variant `policy_id`s that
 *      currently exist for these parents.
 *   2. Query `.fleet-agents` by those exact `policy_id` values — the same field the sweep uses —
 *      so agents enrolled by a downlevel fleet-server that may not have `policy_base_id` set are
 *      also counted. Querying directly on `.fleet-agents` by `policy_base_id` would miss them,
 *      reopening the Half-B gap for that subset. See https://github.com/elastic/kibana/issues/283077
 *
 * Used by `deployPolicies` to ensure that a parent policy update refreshes every variant that
 * actually serves an enrolled agent, not just those in the default bounded set.
 */
export async function getAgentAssignedVersionsForPolicies(
  esClient: ElasticsearchClient,
  parentPolicyIds: string[]
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  if (parentPolicyIds.length === 0) {
    return result;
  }

  // Step 1: enumerate the variant policy_ids that currently exist in .fleet-policies.
  // Driving from .fleet-policies is cheaper than a prefix/wildcard scan on .fleet-agents
  // and is compatible with `search.allow_expensive_queries: false`.
  const policiesResponse = await esClient.search<
    unknown,
    { variant_policy_ids: { buckets: Array<{ key: string }> } }
  >({
    index: AGENT_POLICY_INDEX,
    ignore_unavailable: true,
    size: 0,
    query: {
      bool: {
        filter: [{ terms: { [POLICY_BASE_ID_FIELD]: parentPolicyIds } }],
      },
    },
    aggs: {
      variant_policy_ids: {
        terms: {
          field: 'policy_id',
          size: parentPolicyIds.length * 100,
        },
      },
    },
  });

  const variantIds = (policiesResponse.aggregations?.variant_policy_ids?.buckets ?? [])
    .map((b) => b.key)
    .filter((id) => splitVersionSuffixFromPolicyId(id).version !== null);

  if (variantIds.length === 0) {
    return result;
  }

  // Step 2: query .fleet-agents by the exact variant policy_ids — same field the sweep uses.
  // This catches agents enrolled by a downlevel fleet-server that have no policy_base_id.
  const agentsResponse = await esClient.search<
    unknown,
    { agents_by_policy_id: { buckets: Array<{ key: string }> } }
  >({
    index: '.fleet-agents',
    ignore_unavailable: true,
    size: 0,
    query: {
      bool: {
        filter: [{ terms: { policy_id: variantIds } }],
      },
    },
    aggs: {
      agents_by_policy_id: {
        terms: {
          field: 'policy_id',
          size: variantIds.length,
        },
      },
    },
  });

  const buckets = agentsResponse.aggregations?.agents_by_policy_id?.buckets ?? [];
  for (const { key } of buckets) {
    const { baseId, version } = splitVersionSuffixFromPolicyId(key);
    if (version === null) continue;
    if (!result.has(baseId)) result.set(baseId, new Set());
    result.get(baseId)!.add(version);
  }
  return result;
}

const AGENT_COUNT_CHUNK_SIZE = 1000;

/**
 * Returns the number of agents (including inactive) currently assigned to each of the given full
 * variant policy ids (e.g. `"<parentId>#9.4"`). Any id absent from the result has zero agents.
 *
 * Queries `.fleet-agents` directly by `policy_id` so it picks up agents enrolled by a downlevel
 * fleet-server that may not have a `policy_base_id` field set yet.
 *
 * Deliberately includes inactive and unenrolled agents: an inactive agent still references the
 * variant document and would be stuck on a missing policy if the document were deleted before it
 * reactivates.
 */
export async function getAgentCountsForVariantPolicyIds(
  esClient: ElasticsearchClient,
  variantPolicyIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (variantPolicyIds.length === 0) {
    return counts;
  }

  // Chunk to avoid excessively large `terms` filters.
  for (let i = 0; i < variantPolicyIds.length; i += AGENT_COUNT_CHUNK_SIZE) {
    const chunk = variantPolicyIds.slice(i, i + AGENT_COUNT_CHUNK_SIZE);
    const response = await esClient.search<
      unknown,
      { agents_by_policy_id: { buckets: Array<{ key: string; doc_count: number }> } }
    >({
      index: '.fleet-agents',
      ignore_unavailable: true,
      size: 0,
      // No active/status filter: inactive and unenrolled agents block deletion too.
      query: { bool: { filter: [{ terms: { policy_id: chunk } }] } },
      aggs: {
        agents_by_policy_id: {
          terms: { field: 'policy_id', size: chunk.length },
        },
      },
    });
    for (const { key, doc_count } of response.aggregations?.agents_by_policy_id?.buckets ?? []) {
      counts.set(key, (counts.get(key) ?? 0) + doc_count);
    }
  }
  return counts;
}

export function hasAgentVersionConditionInInputTemplate(
  assetsMap: PackagePolicyAssetsMap
): boolean {
  let hasVersionConditionInInputTemplate = false;
  assetsMap?.forEach((assetBuffer: Buffer | undefined, assetPath: string) => {
    if (assetPath.endsWith('.hbs') && assetBuffer?.toString().includes('_meta.agent.version')) {
      hasVersionConditionInInputTemplate = true;
    }
  });
  return hasVersionConditionInInputTemplate;
}

export function hasAgentVersionCondition(
  pkgInfo: PackageInfo,
  assetsMap: PackagePolicyAssetsMap
): boolean {
  if (!appContextService.getExperimentalFeatures().enableVersionSpecificPolicies) {
    return false;
  }
  if (pkgInfo.conditions?.agent?.version) {
    return true;
  }
  return hasAgentVersionConditionInInputTemplate(assetsMap);
}
