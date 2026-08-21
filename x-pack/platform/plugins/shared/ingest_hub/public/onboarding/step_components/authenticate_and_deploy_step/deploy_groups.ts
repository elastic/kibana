/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendCreateAgentlessPolicy, sendGetPackageInfoByKey } from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type {
  AuthenticateAndDeployStepState,
  ServiceChipState,
} from '../../onboarding_flow_context';
import type { ServiceVars, ServiceInstance } from '../service_settings_step/use_service_settings';
import { buildPackageInputs, buildPackageVars, getPackageVarNames } from './package_inputs';

/**
 * A deploy group is the unit of one `sendCreateAgentlessPolicy` call.
 *
 * - Bundled originals: one group per package, covering all non-duplicate agentless instances
 *   of that package. This restores the pre-PR behaviour (one agent policy for all selected
 *   services of the same package) and keeps resource usage equivalent to a non-duplicate deploy.
 * - Duplicates: one group per instance, because duplicate instances of the same service would
 *   collide inside `buildPackageInputs` (stream keys map on dataset name, which is shared).
 */
export interface DeployGroup {
  /** Package name — used for bundled originals. InstanceId — used for duplicates. */
  groupId: string;
  /** All instanceIds whose status, policyId, and error this call resolves. */
  instanceIds: string[];
  members: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }>;
  isDuplicateGroup: boolean;
}

export interface GroupDeployOutcome {
  policyId?: string;
}

/**
 * Build deploy groups from the current instance list.
 *
 * Grouping strategy:
 *   - Originals (isDuplicate: false): one group per package, bundled into a single
 *     sendCreateAgentlessPolicy call.
 *   - Duplicates (isDuplicate: true): one group per instance, because duplicate instances
 *     of the same service share the same stream key inside buildPackageInputs and would
 *     silently overwrite each other if bundled.
 */
export function buildDeployGroups(
  instances: ServiceInstance[],
  selectedServiceIds: string[],
  servicesMap: Map<string, AwsServiceMatrixEntry>
): DeployGroup[] {
  // Reconcile persisted instances against the current selectedServiceIds — the same logic
  // use_service_settings applies in-memory. Without this, a user who goes back to step 1 and
  // changes their selection would deploy stale instances (deselected services deployed, newly
  // selected services skipped) because setGlobalRegion and Continue don't re-persist instances.
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
  const resolved: ServiceInstance[] = [...kept, ...added];

  const originals: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }> = [];
  const duplicates: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }> = [];

  for (const inst of resolved) {
    const service = servicesMap.get(inst.serviceId);
    if (!service) continue;
    // TODO(follow-up): non-agentless duplicates are silently dropped here.
    // ECF and agent-based duplicate deploy support are tracked in separate follow-up issues.
    if (
      !service.deploymentMethods.some((dm) => dm.method === 'managed_integration' && dm.preferred)
    ) {
      continue;
    }
    if (inst.isDuplicate) {
      duplicates.push({ instance: inst, service });
    } else {
      originals.push({ instance: inst, service });
    }
  }

  // Group originals by package name.
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

function buildAgentlessPolicyName(group: DeployGroup): string {
  // Date.now() suffix prevents cross-session collisions: Fleet enforces unique agent-policy
  // names space-wide, so a fresh-session re-run would fail without it.
  // Truncate to stay within Fleet's policy name length limit.
  if (group.isDuplicateGroup) {
    const { instance } = group.members[0];
    const safe = instance.instanceId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    const name = instance.name.slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${safe}-${name}-${Date.now()}`;
  }
  // Bundled originals — named after the package.
  const pkg = group.groupId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return `${pkg}-${Date.now()}`;
}

export async function deployGroup(
  group: DeployGroup,
  {
    namespace,
    globalRegion,
    storedServiceVars,
    authenticateAndDeployStep,
  }: {
    namespace: string;
    globalRegion: string;
    storedServiceVars: Record<string, ServiceVars>;
    authenticateAndDeployStep: AuthenticateAndDeployStepState;
  }
): Promise<GroupDeployOutcome> {
  // All members share the same packageName — use the first for pkg info.
  const { service: firstService } = group.members[0];
  const pkgInfoResponse = await sendGetPackageInfoByKey(firstService.packageName);
  const pkgInfo = pkgInfoResponse.data?.item;
  const pkgVersion = pkgInfo?.version;
  if (!pkgVersion) {
    throw new Error(`Package ${firstService.packageName} is not installed`);
  }

  const { connectorId, staticKeys } = authenticateAndDeployStep;

  // Build a vars map keyed by service.id for buildPackageInputs.
  // Look up vars by instanceId first; fall back to serviceId for sessions predating instance keying.
  const serviceVarsMap: Record<string, ServiceVars> = {};
  for (const { instance, service } of group.members) {
    serviceVarsMap[service.id] = storedServiceVars[instance.instanceId] ??
      storedServiceVars[instance.serviceId] ?? { enabledInputs: [], vars: {} };
  }

  const services = group.members.map(({ service }) => service);
  const inputs = buildPackageInputs(services, serviceVarsMap, globalRegion);

  // Explicitly disable all package inputs not in our selection to avoid Fleet defaulting
  // enabled inputs that would cause "not allowed for agentless" errors.
  const pkgTemplates: Array<{ name?: string; type?: string; inputs?: Array<{ type: string }> }> =
    (pkgInfo as any).policy_templates ?? [];
  for (const template of pkgTemplates) {
    const templateInputs = template.inputs ?? (template.type ? [{ type: template.type }] : []);
    for (const input of templateInputs) {
      const key = template.name ? `${template.name}-${input.type}` : input.type;
      if (!inputs[key]) {
        inputs[key] = { enabled: false, streams: {} };
      }
    }
  }

  const pkgVarNames = getPackageVarNames(pkgInfo);
  const vars = buildPackageVars(globalRegion, staticKeys, pkgVarNames);

  const response = await sendCreateAgentlessPolicy({
    name: buildAgentlessPolicyName(group),
    namespace,
    package: { name: firstService.packageName, version: pkgVersion },
    ...(vars ? { vars } : {}),
    inputs,
    ...(connectorId ? { cloud_connector: { enabled: true, cloud_connector_id: connectorId } } : {}),
  });

  return { policyId: (response as any)?.data?.item?.policy_ids?.[0] };
}

function extractErrorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (reason !== null && typeof reason === 'object' && 'message' in reason) {
    return String((reason as { message: unknown }).message);
  }
  return String(reason);
}

export function collectDeployResults(
  results: PromiseSettledResult<GroupDeployOutcome>[],
  groups: DeployGroup[]
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
      // All instances in the group share the one policy — write policyId for each.
      if (result.value.policyId) {
        for (const instanceId of group.instanceIds) {
          policyIdsByInstance[instanceId] = result.value.policyId;
        }
      }
    } else {
      // A bundled call failure surfaces as an error on every instance in the group.
      const errorMsg = extractErrorMessage(result.reason);
      for (const instanceId of group.instanceIds) {
        failedInstances.push(instanceId);
        errorsByInstance[instanceId] = errorMsg;
      }
    }
  }

  return { policyIdsByInstance, failedInstances, errorsByInstance };
}

export function buildInstanceStatuses(
  targets: string[],
  failedInstances: string[],
  succeededState: ServiceChipState = 'instantiating'
): Record<string, ServiceChipState> {
  const statuses: Record<string, ServiceChipState> = {};
  const failedSet = new Set(failedInstances);

  for (const instanceId of targets) {
    statuses[instanceId] = failedSet.has(instanceId) ? 'error' : succeededState;
  }

  return statuses;
}
