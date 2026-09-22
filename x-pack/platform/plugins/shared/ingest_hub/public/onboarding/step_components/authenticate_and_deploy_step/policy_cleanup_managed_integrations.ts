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
 * Returns the ops so callers can distinguish deleted vs updated policy IDs.
 */
export async function cleanupManagedIntegrationsPolicies(
  opts: CleanupManagedIntegrationsOpts
): Promise<PolicyCleanupOps> {
  const { pendingCleanupPolicyIds, currentPolicyIdsByInstance } = opts;
  const ops = computePolicyCleanupOps(pendingCleanupPolicyIds, currentPolicyIdsByInstance);
  const { toDelete, toUpdate } = ops;

  await Promise.allSettled([
    ...toDelete.map((policyId) =>
      sendDeleteAgentlessPolicy(policyId).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(
          `[ingest_hub] Failed to delete managed-integrations policy ${policyId}:`,
          err
        );
      })
    ),
    ...toUpdate.map(({ policyId, survivingInstanceIds }) =>
      updateManagedIntegrationsPolicy(policyId, survivingInstanceIds, opts).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(
          `[ingest_hub] Failed to update managed-integrations policy ${policyId}:`,
          err
        );
      })
    ),
  ]);

  return ops;
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
  if (!members) return;

  const packageName = members[0].service.packageName;
  const pkgInfoResponse = await sendGetPackageInfoByKey(packageName);
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
    inputs?: Array<{ type: string }>;
  }> =
    ((pkgInfo as unknown as Record<string, unknown>).policy_templates as typeof pkgTemplates) ?? [];
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
