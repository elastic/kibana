/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeployGroup } from './deploy_groups';
import { collectDeployResults } from './deploy_group_helpers';

/**
 * A group whose services join a package policy the deployment already has, so the policy is
 * updated (PUT) instead of a second one being created (POST).
 */
export interface PolicyExtension {
  policyId: string;
  group: DeployGroup;
  /** Every instance the updated policy covers: its tracked members plus the ones being added. */
  memberInstanceIds: string[];
  /** The instances of the group this update resolves; they map to `policyId` once it succeeds. */
  resolvedInstanceIds: string[];
}

export interface PolicyReusePlan {
  /** Groups with no policy to join; deployed as new policies. */
  createGroups: DeployGroup[];
  extensions: PolicyExtension[];
}

/**
 * Splits the groups to deploy into the ones that join an existing package policy and the ones that
 * need a new one.
 *
 * A group reuses a policy when another instance of the same group (same package and namespace) is
 * already tracked: one package policy bundles all services of a package. Duplicate groups never
 * reuse, because duplicate instances would overwrite each other's streams inside one policy.
 *
 * @param groupsToDeploy - groups with something to deploy. May list only the untracked members
 *   (managed integrations) or the whole group (agent-based).
 * @param allGroups - every active group with all of its members, to find the tracked ones.
 */
export function planPolicyReuse(
  groupsToDeploy: DeployGroup[],
  allGroups: DeployGroup[],
  policyIdsByInstance: Record<string, string>
): PolicyReusePlan {
  const createGroups: DeployGroup[] = [];
  const extensions: PolicyExtension[] = [];
  const groupsById = new Map(allGroups.map((g) => [g.groupId, g]));

  for (const group of groupsToDeploy) {
    const fullGroup = groupsById.get(group.groupId) ?? group;
    const policyId = fullGroup.isDuplicateGroup
      ? undefined
      : pickGroupPolicyId(fullGroup.instanceIds, policyIdsByInstance);
    if (!policyId) {
      createGroups.push(group);
      continue;
    }
    const trackedHere = fullGroup.instanceIds.filter((id) => policyIdsByInstance[id] === policyId);
    const resolvedInstanceIds = group.instanceIds.filter(
      (id) => !(id in policyIdsByInstance) || policyIdsByInstance[id] === policyId
    );
    extensions.push({
      policyId,
      group,
      memberInstanceIds: [...new Set([...trackedHere, ...resolvedInstanceIds])],
      resolvedInstanceIds,
    });
  }

  return { createGroups, extensions };
}

/**
 * The policy most of the group's tracked instances live on. Older deployments may have left one
 * package spread over several policies; those are not merged here, new services join the largest.
 */
function pickGroupPolicyId(
  instanceIds: string[],
  policyIdsByInstance: Record<string, string>
): string | undefined {
  const counts = new Map<string, number>();
  for (const id of instanceIds) {
    const policyId = policyIdsByInstance[id];
    if (policyId) counts.set(policyId, (counts.get(policyId) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [policyId, count] of counts) {
    if (count > bestCount) {
      best = policyId;
      bestCount = count;
    }
  }
  return best;
}

/** Per-instance outcome of the extension updates, in the shape `collectDeployResults` returns. */
export function collectExtensionResults(
  extensions: PolicyExtension[],
  results: Array<PromiseSettledResult<unknown>>
): {
  policyIdsByInstance: Record<string, string>;
  failedInstances: string[];
  errorsByInstance: Record<string, string>;
} {
  return collectDeployResults(
    results.map((result, i) =>
      result.status === 'fulfilled'
        ? { status: 'fulfilled' as const, value: { policyId: extensions[i].policyId } }
        : result
    ),
    extensions.map(({ resolvedInstanceIds }) => ({ instanceIds: resolvedInstanceIds }))
  );
}

/**
 * Instances joining each policy that are not tracked yet, keyed by policy id. Cleanup and dirty
 * updates add these to the members they write, so a policy that is changed, added to and pruned
 * in one run gets a single PUT.
 */
export function newMembersByPolicy(
  extensions: PolicyExtension[],
  policyIdsByInstance: Record<string, string>
): Record<string, string[]> {
  const byPolicy: Record<string, string[]> = {};
  for (const { policyId, resolvedInstanceIds } of extensions) {
    const added = resolvedInstanceIds.filter((id) => !(id in policyIdsByInstance));
    if (added.length > 0) byPolicy[policyId] = [...(byPolicy[policyId] ?? []), ...added];
  }
  return byPolicy;
}

/**
 * Extension outcomes in `extensions` order: an extension whose policy an earlier phase already
 * wrote this run (`claimed`) succeeded with that write, the others take their own attempt's result.
 */
export function mergeExtensionResults(
  extensions: PolicyExtension[],
  attempted: PolicyExtension[],
  attemptedResults: Array<PromiseSettledResult<unknown>>
): Array<PromiseSettledResult<unknown>> {
  const byExtension = new Map(attempted.map((ext, i) => [ext, attemptedResults[i]]));
  return extensions.map(
    (ext) => byExtension.get(ext) ?? { status: 'fulfilled' as const, value: undefined }
  );
}
