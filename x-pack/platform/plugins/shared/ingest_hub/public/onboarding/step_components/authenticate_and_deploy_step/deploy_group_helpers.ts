/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceInstance, ServiceVars } from '../service_settings_step/use_service_settings';
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

const sanitizeGroupId = (groupId: string): string =>
  groupId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);

export const buildGroupPolicyNameStem = (group: DeployGroup): string =>
  group.policyNameStem ?? sanitizeGroupId(group.groupId);

export const DEFAULT_NAMESPACE = 'default';

function instanceNamespace(
  instance: ServiceInstance,
  storedServiceVars: Record<string, ServiceVars>
): string {
  return storedServiceVars[instance.instanceId]?.namespace ?? '';
}

/**
 * Group originals by packageName and namespace, and make each duplicate its own group.
 *
 * - Originals (isDuplicate: false): bundled per package and namespace into a DeployGroup so that
 *   all services of the same package sharing a namespace use a single policy call. A policy has
 *   one namespace, so instances with different namespaces cannot share one.
 * - Duplicates (isDuplicate: true): one DeployGroup each, because duplicate instances share the
 *   same stream key inside buildPackageInputs and would silently overwrite each other if bundled.
 */
export function groupByPackage(
  originals: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }>,
  duplicates: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }>,
  storedServiceVars: Record<string, ServiceVars> = {}
): DeployGroup[] {
  const bundled = new Map<
    string,
    {
      namespace: string;
      members: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }>;
    }
  >();
  for (const member of originals) {
    const pkg = member.service.packageName;
    const namespace = instanceNamespace(member.instance, storedServiceVars);
    const groupId = namespace ? `${pkg}__${namespace}` : pkg;
    const group = bundled.get(groupId) ?? { namespace, members: [] };
    group.members.push(member);
    bundled.set(groupId, group);
  }

  const groups: DeployGroup[] = [];
  // Sanitizing is lossy (`prod.eu` and `prod_eu` both become `prod_eu`) and groups deploy in the
  // same millisecond, so a counter keeps the name stems of one deploy distinct.
  const usedStems = new Set<string>();
  for (const [groupId, { namespace, members }] of bundled) {
    const baseStem = sanitizeGroupId(groupId);
    let policyNameStem = baseStem;
    for (let n = 2; usedStems.has(policyNameStem); n++) policyNameStem = `${baseStem}_${n}`;
    usedStems.add(policyNameStem);
    groups.push({
      groupId,
      instanceIds: members.map(({ instance }) => instance.instanceId),
      members,
      isDuplicateGroup: false,
      namespace,
      policyNameStem,
    });
  }
  for (const member of duplicates) {
    groups.push({
      groupId: member.instance.instanceId,
      instanceIds: [member.instance.instanceId],
      members: [member],
      isDuplicateGroup: true,
      namespace: instanceNamespace(member.instance, storedServiceVars),
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
