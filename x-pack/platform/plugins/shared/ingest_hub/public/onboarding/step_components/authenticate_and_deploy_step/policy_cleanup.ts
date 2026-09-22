/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sendDeleteAgentlessPolicy,
  sendUpdateAgentlessPolicy,
  sendGetPackageInfoByKey,
  sendDeletePackagePolicy,
  sendUpdatePackagePolicy,
} from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { AuthenticateAndDeployStepState } from '../../onboarding_flow_context';
import type { ServiceInstance, ServiceVars } from '../service_settings_step/use_service_settings';
import { buildPackageInputs, buildPackageVars, getPackageVarNames } from './package_inputs';

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
    if (policyMap.has(policyId)) {
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

interface BuildPolicyBodyOpts {
  instances: ServiceInstance[];
  storedServiceVars: Record<string, ServiceVars>;
  globalRegion: string;
  namespace: string;
  authenticateAndDeployStep: AuthenticateAndDeployStepState;
  servicesMap: Map<string, AwsServiceMatrixEntry>;
}

/** Build surviving members list and package name from surviving instance IDs. Returns null if no valid members. */
function resolveSurvivingMembers(
  survivingInstanceIds: string[],
  instances: ServiceInstance[],
  servicesMap: Map<string, AwsServiceMatrixEntry>
): Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }> | null {
  const instanceById = new Map(instances.map((i) => [i.instanceId, i]));
  const members = survivingInstanceIds
    .map((id) => {
      const inst = instanceById.get(id);
      if (!inst) return null;
      const service = servicesMap.get(inst.serviceId);
      if (!service) return null;
      return { instance: inst, service };
    })
    .filter((m): m is { instance: ServiceInstance; service: AwsServiceMatrixEntry } => m !== null);
  return members.length > 0 ? members : null;
}

// ── Agentless cleanup ──────────────────────────────────────────────────────────

interface CleanupAgentlessOpts extends BuildPolicyBodyOpts {
  pendingCleanupPolicyIds: Record<string, string>;
  currentPolicyIdsByInstance: Record<string, string>;
}

/**
 * Delete or update agentless (managed_integration) policies for removed services.
 * Best-effort: individual failures are logged but do not block the deploy.
 */
export async function cleanupAgentlessPolicies(opts: CleanupAgentlessOpts): Promise<void> {
  const { pendingCleanupPolicyIds, currentPolicyIdsByInstance } = opts;
  const { toDelete, toUpdate } = computePolicyCleanupOps(
    pendingCleanupPolicyIds,
    currentPolicyIdsByInstance
  );

  await Promise.allSettled([
    ...toDelete.map((policyId) =>
      sendDeleteAgentlessPolicy(policyId).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`[ingest_hub] Failed to delete agentless policy ${policyId}:`, err);
      })
    ),
    ...toUpdate.map(({ policyId, survivingInstanceIds }) =>
      updateAgentlessPolicy(policyId, survivingInstanceIds, opts).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`[ingest_hub] Failed to update agentless policy ${policyId}:`, err);
      })
    ),
  ]);
}

async function updateAgentlessPolicy(
  policyId: string,
  survivingInstanceIds: string[],
  opts: BuildPolicyBodyOpts
): Promise<void> {
  const {
    instances,
    storedServiceVars,
    globalRegion,
    namespace,
    authenticateAndDeployStep,
    servicesMap,
  } = opts;

  const members = resolveSurvivingMembers(survivingInstanceIds, instances, servicesMap);
  if (!members) return;

  const packageName = members[0].service.packageName;
  const pkgInfoResponse = await sendGetPackageInfoByKey(packageName);
  const pkgInfo = pkgInfoResponse.data?.item;
  const pkgVersion = pkgInfo?.version;
  if (!pkgVersion || !pkgInfo) return;

  const serviceVarsMap: Record<string, ServiceVars> = {};
  for (const { instance, service } of members) {
    serviceVarsMap[service.id] =
      storedServiceVars[instance.instanceId] ??
      storedServiceVars[instance.serviceId] ?? {
        enabledDataStreams: service.dataStreams,
        varsByDataStream: {},
      };
  }

  const services = members.map(({ service }) => service);
  const inputs = buildPackageInputs(services, serviceVarsMap, globalRegion);

  // Explicitly disable unrelated inputs (Fleet may enable them by manifest default).
  const pkgTemplates: Array<{
    name?: string;
    input?: string;
    inputs?: Array<{ type: string }>;
  }> = (pkgInfo as unknown as Record<string, unknown>).policy_templates as typeof pkgTemplates ?? [];
  for (const template of pkgTemplates) {
    const templateInputs = template.inputs ?? (template.input ? [{ type: template.input }] : []);
    for (const input of templateInputs) {
      const key = template.name ? `${template.name}-${input.type}` : input.type;
      if (!inputs[key]) inputs[key] = { enabled: false, streams: {} };
    }
  }

  const { connectorId, staticKeys } = authenticateAndDeployStep;
  const pkgVarNames = getPackageVarNames(pkgInfo as { vars?: Array<{ name: string }> });
  const vars = buildPackageVars(globalRegion, staticKeys, pkgVarNames);

  await sendUpdateAgentlessPolicy(policyId, {
    name: `${packageName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}`,
    namespace,
    package: { name: packageName, version: pkgVersion },
    ...(vars ? { vars } : {}),
    inputs,
    ...(connectorId
      ? {
          cloud_connector: {
            enabled: true,
            cloud_connector_id: connectorId,
            target_csp: 'aws' as const,
          },
        }
      : {}),
  });
}

// ── Agent-based (package policy) cleanup ─────────────────────────────────────

interface CleanupPackagePoliciesOpts extends BuildPolicyBodyOpts {
  pendingCleanupPolicyIds: Record<string, string>;
  currentPolicyIdsByInstance: Record<string, string>;
  selectedAgentPolicyIds: string[];
}

/**
 * Delete or update package policies for removed agent-based services.
 * The agent policy itself is never deleted — enrolled agents would become orphaned.
 * Best-effort: individual failures are logged but do not block the deploy.
 */
export async function cleanupPackagePolicies(opts: CleanupPackagePoliciesOpts): Promise<void> {
  const { pendingCleanupPolicyIds, currentPolicyIdsByInstance } = opts;
  const { toDelete, toUpdate } = computePolicyCleanupOps(
    pendingCleanupPolicyIds,
    currentPolicyIdsByInstance
  );

  await Promise.allSettled([
    ...toDelete.map((policyId) =>
      sendDeletePackagePolicy({ packagePolicyIds: [policyId] }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`[ingest_hub] Failed to delete package policy ${policyId}:`, err);
      })
    ),
    ...toUpdate.map(({ policyId, survivingInstanceIds }) =>
      updatePackagePolicy(policyId, survivingInstanceIds, opts).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`[ingest_hub] Failed to update package policy ${policyId}:`, err);
      })
    ),
  ]);
}

async function updatePackagePolicy(
  policyId: string,
  survivingInstanceIds: string[],
  opts: CleanupPackagePoliciesOpts
): Promise<void> {
  const {
    instances,
    storedServiceVars,
    globalRegion,
    namespace,
    authenticateAndDeployStep,
    servicesMap,
    selectedAgentPolicyIds,
  } = opts;

  const members = resolveSurvivingMembers(survivingInstanceIds, instances, servicesMap);
  if (!members) return;

  const packageName = members[0].service.packageName;
  const pkgInfoResponse = await sendGetPackageInfoByKey(packageName);
  const pkgInfo = pkgInfoResponse.data?.item;
  const pkgVersion = pkgInfo?.version;
  if (!pkgVersion || !pkgInfo) return;

  const serviceVarsMap: Record<string, ServiceVars> = {};
  for (const { instance, service } of members) {
    serviceVarsMap[service.id] =
      storedServiceVars[instance.instanceId] ??
      storedServiceVars[instance.serviceId] ?? {
        enabledDataStreams: service.dataStreams,
        varsByDataStream: {},
      };
  }

  const services = members.map(({ service }) => service);
  const inputs = buildPackageInputs(services, serviceVarsMap, globalRegion);

  const pkgTemplates: Array<{
    name?: string;
    input?: string;
    inputs?: Array<{ type: string }>;
  }> = (pkgInfo as unknown as Record<string, unknown>).policy_templates as typeof pkgTemplates ?? [];
  for (const template of pkgTemplates) {
    const templateInputs = template.inputs ?? (template.input ? [{ type: template.input }] : []);
    for (const input of templateInputs) {
      const key = template.name ? `${template.name}-${input.type}` : input.type;
      if (!inputs[key]) inputs[key] = { enabled: false, streams: {} };
    }
  }

  const { staticKeys } = authenticateAndDeployStep;
  const pkgVarNames = getPackageVarNames(pkgInfo as { vars?: Array<{ name: string }> });
  const vars = buildPackageVars(globalRegion, staticKeys, pkgVarNames);

  await sendUpdatePackagePolicy(policyId, {
    name: `${packageName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}`,
    enabled: true,
    namespace,
    package: { name: packageName, version: pkgVersion },
    ...(vars ? { vars } : {}),
    inputs,
    policy_ids: selectedAgentPolicyIds,
  } as unknown as Parameters<typeof sendUpdatePackagePolicy>[1]);
}
