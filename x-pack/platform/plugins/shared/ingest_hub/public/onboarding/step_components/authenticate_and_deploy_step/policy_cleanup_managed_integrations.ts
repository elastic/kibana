/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sendDeleteAgentlessPolicy,
  sendUpdateAgentlessPolicy,
  sendGetAgentlessPolicy,
  sendGetPackageInfoByKey,
} from '@kbn/fleet-plugin/public';

import type { ServiceVars } from '../service_settings_step/use_service_settings';
import { buildPackageInputs, buildPackageVars, getPackageVarNames } from './package_inputs';
import { computePolicyCleanupOps, resolveSurvivingMembers } from './policy_cleanup';
import type { BuildPolicyBodyOpts, PolicyCleanupOps } from './policy_cleanup';

export interface CleanupManagedIntegrationsOpts extends BuildPolicyBodyOpts {
  pendingCleanupPolicyIds: Record<string, string>;
  currentPolicyIdsByInstance: Record<string, string>;
}

/**
 * Delete or update managed-integrations (agentless) policies for removed services.
 * Best-effort: individual failures are logged but do not block the deploy.
 * Returns only the ops that actually succeeded so callers can selectively clear
 * pendingCleanupPolicyIds — a failed cleanup remains staged for retry.
 */
export async function cleanupManagedIntegrationsPolicies(
  opts: CleanupManagedIntegrationsOpts
): Promise<PolicyCleanupOps> {
  const { pendingCleanupPolicyIds, currentPolicyIdsByInstance } = opts;
  const planned = computePolicyCleanupOps(pendingCleanupPolicyIds, currentPolicyIdsByInstance);

  const succeededDeletes: string[] = [];
  const succeededUpdates: Array<{ policyId: string; survivingInstanceIds: string[] }> = [];

  await Promise.allSettled([
    ...planned.toDelete.map((policyId) =>
      sendDeleteAgentlessPolicy(policyId)
        .then(() => {
          succeededDeletes.push(policyId);
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error(`Failed to delete managed-integrations policy ${policyId}:`, err);
        })
    ),
    ...planned.toUpdate.map(({ policyId, survivingInstanceIds }) =>
      updateManagedIntegrationsPolicy(policyId, survivingInstanceIds, opts)
        .then(() => {
          succeededUpdates.push({ policyId, survivingInstanceIds });
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error(`Failed to update managed-integrations policy ${policyId}:`, err);
        })
    ),
  ]);

  return { toDelete: succeededDeletes, toUpdate: succeededUpdates };
}

async function updateManagedIntegrationsPolicy(
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
  if (!members) {
    throw new Error(
      `Cannot update managed-integration policy ${policyId}: one or more surviving instance IDs could not be resolved — leaving it pending for retry.`
    );
  }

  const packageName = members[0].service.packageName;

  // Fetch existing policy to preserve its name, namespace, and package version (avoids
  // timestamp-based name churn, namespace drift, and implicit package upgrades on a cleanup PUT).
  let existingGetResult: Awaited<ReturnType<typeof sendGetAgentlessPolicy>>;
  try {
    existingGetResult = await sendGetAgentlessPolicy(policyId);
  } catch {
    throw new Error(
      `Cannot safely update managed-integration policy ${policyId}: failed to fetch existing metadata.`
    );
  }
  if (!existingGetResult.item) {
    throw new Error(
      `Cannot safely update managed-integration policy ${policyId}: GET succeeded but returned no item.`
    );
  }
  const existingName = existingGetResult.item.name;
  const existingNamespace = existingGetResult.item.namespace;
  const existingVersion = existingGetResult.item.package?.version;

  const pkgInfoResponse = await sendGetPackageInfoByKey(packageName, existingVersion);
  const pkgInfo = pkgInfoResponse.data?.item;
  const pkgVersion = pkgInfo?.version;
  if (!pkgVersion || !pkgInfo) return;

  const serviceVarsMap: Record<string, ServiceVars> = {};
  for (const { instance, service } of members) {
    serviceVarsMap[service.id] = storedServiceVars[instance.instanceId] ??
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
    inputs?: Array<{ id?: string; type: string }>;
  }> =
    ((pkgInfo as unknown as Record<string, unknown>).policy_templates as typeof pkgTemplates) ?? [];
  for (const template of pkgTemplates) {
    const templateInputs = template.inputs ?? (template.input ? [{ type: template.input }] : []);
    for (const input of templateInputs) {
      const inputKey = input.id ?? input.type;
      const key = template.name ? `${template.name}-${inputKey}` : inputKey;
      if (!inputs[key]) inputs[key] = { enabled: false, streams: {} };
    }
  }

  const { staticKeys } = authenticateAndDeployStep;
  const pkgVarNames = getPackageVarNames(pkgInfo as { vars?: Array<{ name: string }> });
  const vars = buildPackageVars(globalRegion, staticKeys, pkgVarNames);

  const policyName = existingName ?? `${packageName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}`;
  const policyNamespace = existingNamespace ?? namespace;

  // Preserve the connector already on the policy (a Fleet operator may have reassigned it
  // since the wizard ran); never substitute the stale wizard connectorId.
  const existingCloudConnector = existingGetResult.item.cloud_connector;

  await sendUpdateAgentlessPolicy(policyId, {
    name: policyName,
    namespace: policyNamespace,
    package: { name: packageName, version: pkgVersion },
    ...(vars ? { vars } : {}),
    inputs,
    ...(existingCloudConnector ? { cloud_connector: existingCloudConnector } : {}),
  });
}
