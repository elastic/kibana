/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { AuthenticateAndDeployStepState } from '../../onboarding_flow_context';
import type { ServiceInstance, ServiceVars } from '../service_settings_step/use_service_settings';

export interface PolicyCleanupOps {
  /** Policy IDs where every instance was removed — delete the whole policy. */
  toDelete: string[];
  /** Policy IDs where only some instances were removed — update inputs to surviving members only. */
  toUpdate: Array<{ policyId: string; survivingInstanceIds: string[] }>;
}

/**
 * Compute which deployed policies need to be deleted or updated after service removal.
 *
 * Because one policy is created per package (not per service), a single policy may cover
 * multiple services. The decision is:
 *   - All instances of that policy removed → delete
 *   - Some instances survive → update (rebuild inputs without removed services)
 *
 * @param pendingCleanupPolicyIds - instanceId → policyId for instances removed from Step 1
 *   and not yet cleaned up in Fleet. Populated by removeDeployInstance.
 * @param currentPolicyIdsByInstance - instanceId → policyId for still-deployed instances.
 *   Used to find surviving members of each affected policy.
 */
export function computePolicyCleanupOps(
  pendingCleanupPolicyIds: Record<string, string>,
  currentPolicyIdsByInstance: Record<string, string>
): PolicyCleanupOps {
  if (Object.keys(pendingCleanupPolicyIds).length === 0) {
    return { toDelete: [], toUpdate: [] };
  }

  // Build per-policy view: which instances were removed and which survive.
  const policyMap = new Map<string, { surviving: string[] }>();

  for (const policyId of Object.values(pendingCleanupPolicyIds)) {
    if (!policyMap.has(policyId)) policyMap.set(policyId, { surviving: [] });
  }

  for (const [instanceId, policyId] of Object.entries(currentPolicyIdsByInstance)) {
    // Exclude instances that are in the pending-removal set — they're being removed, not surviving.
    // This matters for the live-stale path where policyIdsByInstance isn't pre-pruned.
    if (policyMap.has(policyId) && !(instanceId in pendingCleanupPolicyIds)) {
      policyMap.get(policyId)!.surviving.push(instanceId);
    }
  }

  const toDelete: string[] = [];
  const toUpdate: Array<{ policyId: string; survivingInstanceIds: string[] }> = [];

  for (const [policyId, { surviving }] of policyMap) {
    if (surviving.length === 0) {
      toDelete.push(policyId);
    } else {
      toUpdate.push({ policyId, survivingInstanceIds: surviving });
    }
  }

  return { toDelete, toUpdate };
}

// ── Shared body builder ────────────────────────────────────────────────────────

export interface BuildPolicyBodyOpts {
  instances: ServiceInstance[];
  storedServiceVars: Record<string, ServiceVars>;
  globalRegion: string;
  namespace: string;
  authenticateAndDeployStep: AuthenticateAndDeployStepState;
  servicesMap: Map<string, AwsServiceMatrixEntry>;
}

/** Build surviving members list and package name from surviving instance IDs. Returns null if no valid members. */
export function resolveSurvivingMembers(
  survivingInstanceIds: string[],
  instances: ServiceInstance[],
  servicesMap: Map<string, AwsServiceMatrixEntry>
): Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }> | null {
  const instanceById = new Map(instances.map((i) => [i.instanceId, i]));
  const rawMembers = survivingInstanceIds.map((id) => {
    // Fall back to a synthetic base instance (instanceId === serviceId) when session-storage
    // instances are absent — e.g. the user skipped Step 2 or sessions don't overlap.
    const inst = instanceById.get(id) ?? {
      instanceId: id,
      serviceId: id,
      name: id,
      isDuplicate: false,
    };
    const service = servicesMap.get(inst.serviceId);
    if (!service) return null;
    return { instance: inst, service };
  });
  // Fail the whole resolution if any ID couldn't be matched — a partial update risks silently
  // dropping surviving services from the shared policy.
  if (rawMembers.some((m) => m === null)) return null;
  const members = rawMembers as Array<{
    instance: ServiceInstance;
    service: AwsServiceMatrixEntry;
  }>;
  return members.length > 0 ? members : null;
}
