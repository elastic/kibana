/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pure helpers for computing cleanup state shared between the MI and agent-based
 * deploy flows. Keeping them separate makes them unit-testable without React rendering.
 */

/**
 * Returns the subset of policyIdsByInstance whose instanceId is no longer present
 * in activeInstanceIds (i.e. the user deselected that service from Step 1).
 */
export function buildLiveStalePolicyIds(
  policyIdsByInstance: Record<string, string>,
  activeInstanceIds: Set<string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [iid, pid] of Object.entries(policyIdsByInstance)) {
    if (!activeInstanceIds.has(iid)) result[iid] = pid;
  }
  return result;
}

/**
 * Merges live-stale entries (Step-1 deselections) with explicitly-staged
 * pending cleanup IDs (Step-4 deselections via removeDeployInstance).
 * pendingCleanupPolicyIds values take precedence on key collision.
 */
export function buildEffectivePendingCleanup(
  liveStalePolicyIds: Record<string, string>,
  pendingCleanupPolicyIds: Record<string, string> | undefined
): Record<string, string> {
  return { ...liveStalePolicyIds, ...(pendingCleanupPolicyIds ?? {}) };
}

/**
 * After cleanup runs, returns the live-stale instanceIds that were successfully
 * cleaned (their policy was deleted or the instance was removed from an updated
 * policy). `survivingInstanceIds` is MI-specific: when a policy is updated rather
 * than deleted, some instanceIds remain in the policy and must NOT be pruned.
 */
export function buildCleanedLiveStale(
  liveStalePolicyIds: Record<string, string>,
  succeededPolicyIds: Set<string>,
  survivingInstanceIds?: Set<string>
): string[] {
  return Object.keys(liveStalePolicyIds).filter((id) => {
    if (survivingInstanceIds?.has(id)) return false;
    return succeededPolicyIds.has(liveStalePolicyIds[id]);
  });
}

/**
 * After cleanup, returns the staged pending entries that still need retry
 * (those whose policyId was not successfully processed this run).
 */
export function buildRemainingPending(
  pendingCleanupPolicyIds: Record<string, string> | undefined,
  succeededPolicyIds: Set<string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(pendingCleanupPolicyIds ?? {}).filter(
      ([, policyId]) => !succeededPolicyIds.has(policyId)
    )
  );
}
