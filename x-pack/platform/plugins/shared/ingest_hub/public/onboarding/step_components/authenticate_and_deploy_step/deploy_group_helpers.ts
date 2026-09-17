/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceInstance } from '../service_settings_step/use_service_settings';
import type { DeployGroup } from './deploy_groups';
import { extractErrorMessage } from './deploy_errors';

/**
 * Reconcile persisted instances against the current selectedServiceIds.
 *
 * - Keeps only instances whose serviceId is in selectedServiceIds (drops deselected ones).
 * - Adds a synthetic base instance for each newly selected service not already covered.
 *
 * This mirrors the logic use_service_settings applies in-memory. Without it, a user who goes
 * back to step 1 and changes their selection would deploy stale instances.
 */
export function reconcileInstances(
  instances: ServiceInstance[],
  selectedServiceIds: string[],
  servicesMap: Map<string, AwsServiceMatrixEntry>
): ServiceInstance[] {
  const selectedSet = new Set(selectedServiceIds);
  const kept = instances.filter((inst) => selectedSet.has(inst.serviceId));
  const coveredServiceIds = new Set(kept.map((i) => i.serviceId));
  const added: ServiceInstance[] = [];
  for (const id of selectedServiceIds) {
    if (!coveredServiceIds.has(id)) {
      const service = servicesMap.get(id);
      if (service?.showInUI) {
        added.push({ instanceId: id, serviceId: id, name: service.name, isDuplicate: false });
      }
    }
  }
  return [...kept, ...added];
}

/**
 * Group originals by packageName and make each duplicate its own group.
 *
 * - Originals (isDuplicate: false): bundled one-per-package into a DeployGroup so that all
 *   services of the same package share a single agentless policy call.
 * - Duplicates (isDuplicate: true): one DeployGroup each, because duplicate instances share the
 *   same stream key inside buildPackageInputs and would silently overwrite each other if bundled.
 */
export function groupByPackage(
  originals: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }>,
  duplicates: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }>
): DeployGroup[] {
  const bundledByPackage = new Map<
    string,
    Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }>
  >();
  for (const member of originals) {
    const pkg = member.service.packageName;
    if (!bundledByPackage.has(pkg)) bundledByPackage.set(pkg, []);
    bundledByPackage.get(pkg)!.push(member);
  }

  const groups: DeployGroup[] = [];
  for (const [pkg, members] of bundledByPackage) {
    groups.push({
      groupId: pkg,
      instanceIds: members.map(({ instance }) => instance.instanceId),
      members,
      isDuplicateGroup: false,
    });
  }
  for (const member of duplicates) {
    groups.push({
      groupId: member.instance.instanceId,
      instanceIds: [member.instance.instanceId],
      members: [member],
      isDuplicateGroup: true,
    });
  }

  return groups;
}

export interface GroupDeployOutcome {
  policyId?: string;
}

/**
 * Collect the settled results of Promise.allSettled deploy calls into per-instance maps.
 *
 * Works with any group type that has `instanceIds: string[]` — both DeployGroup (agentless) and
 * any future agent-based grouping.
 */
export function collectDeployResults<G extends { instanceIds: string[] }>(
  results: PromiseSettledResult<GroupDeployOutcome>[],
  groups: G[]
): {
  policyIdsByInstance: Record<string, string>;
  failedInstances: string[];
  errorsByInstance: Record<string, string>;
} {
  const policyIdsByInstance: Record<string, string> = {};
  const failedInstances: string[] = [];
  const errorsByInstance: Record<string, string> = {};

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const result = results[i];
    if (result.status === 'fulfilled') {
      if (result.value.policyId) {
        for (const instanceId of group.instanceIds) {
          policyIdsByInstance[instanceId] = result.value.policyId;
        }
      }
    } else {
      const errorMsg = extractErrorMessage(result.reason);
      for (const instanceId of group.instanceIds) {
        failedInstances.push(instanceId);
        errorsByInstance[instanceId] = errorMsg;
      }
    }
  }

  return { policyIdsByInstance, failedInstances, errorsByInstance };
}
