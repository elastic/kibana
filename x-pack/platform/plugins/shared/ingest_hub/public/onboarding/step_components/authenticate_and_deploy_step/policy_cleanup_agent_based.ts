/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sendDeletePackagePolicy,
  sendUpdatePackagePolicy,
  sendGetOnePackagePolicy,
  sendGetPackageInfoByKey,
} from '@kbn/fleet-plugin/public';

import type { ServiceVars } from '../service_settings_step/use_service_settings';
import { buildPackageInputs, buildPackageVars, getPackageVarNames } from './package_inputs';
import type { AgentCredentialVars } from './package_inputs';
import { computePolicyCleanupOps, resolveSurvivingMembers } from './policy_cleanup';
import type { BuildPolicyBodyOpts, PolicyCleanupOps } from './policy_cleanup';

export interface CleanupAgentBasedOpts extends BuildPolicyBodyOpts {
  pendingCleanupPolicyIds: Record<string, string>;
  currentPolicyIdsByInstance: Record<string, string>;
  selectedAgentPolicyIds: string[];
  agentCredentials?: AgentCredentialVars;
}

/**
 * Delete or update package policies for removed agent-based services.
 * The agent policy itself is never deleted — enrolled agents would become orphaned.
 * Best-effort: individual failures are logged but do not block the deploy.
 * Returns only the ops that actually succeeded so callers can selectively clear
 * pendingCleanupPolicyIds — a failed cleanup remains staged for retry.
 */
export async function cleanupAgentBasedPolicies(
  opts: CleanupAgentBasedOpts
): Promise<PolicyCleanupOps> {
  const { pendingCleanupPolicyIds, currentPolicyIdsByInstance } = opts;
  const planned = computePolicyCleanupOps(pendingCleanupPolicyIds, currentPolicyIdsByInstance);

  const succeededDeletes: string[] = [];
  const succeededUpdates: Array<{ policyId: string; survivingInstanceIds: string[] }> = [];

  await Promise.allSettled([
    ...planned.toDelete.map((policyId) =>
      sendDeletePackagePolicy({ packagePolicyIds: [policyId] })
        .then(() => {
          succeededDeletes.push(policyId);
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error(
            `[ingest_hub] Failed to delete agent-based package policy ${policyId}:`,
            err
          );
        })
    ),
    ...planned.toUpdate.map(({ policyId, survivingInstanceIds }) =>
      updateAgentBasedPolicy(policyId, survivingInstanceIds, opts)
        .then(() => {
          succeededUpdates.push({ policyId, survivingInstanceIds });
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error(
            `[ingest_hub] Failed to update agent-based package policy ${policyId}:`,
            err
          );
        })
    ),
  ]);

  return { toDelete: succeededDeletes, toUpdate: succeededUpdates };
}

async function updateAgentBasedPolicy(
  policyId: string,
  survivingInstanceIds: string[],
  opts: CleanupAgentBasedOpts
): Promise<void> {
  const {
    instances,
    storedServiceVars,
    globalRegion,
    namespace,
    authenticateAndDeployStep,
    servicesMap,
    selectedAgentPolicyIds,
    agentCredentials,
  } = opts;

  const members = resolveSurvivingMembers(survivingInstanceIds, instances, servicesMap);
  if (!members) return;

  const packageName = members[0].service.packageName;

  // Fetch existing package policy to preserve its name and namespace.
  let existingName: string | undefined;
  let existingNamespace: string | undefined;
  let existingVersion: string | undefined;
  try {
    const existing = await sendGetOnePackagePolicy(policyId);
    existingName = existing.data?.item?.name;
    existingNamespace = existing.data?.item?.namespace;
    existingVersion = existing.data?.item?.package?.version;
  } catch {
    // Non-fatal — fall back to generated name, hook namespace, and latest package version.
  }

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

  const { staticKeys } = authenticateAndDeployStep;
  const pkgVarNames = getPackageVarNames(pkgInfo as { vars?: Array<{ name: string }> });
  const vars = buildPackageVars(globalRegion, staticKeys, pkgVarNames, agentCredentials);

  const policyName = existingName ?? `${packageName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}`;
  const policyNamespace = existingNamespace ?? namespace;

  await sendUpdatePackagePolicy(policyId, {
    name: policyName,
    enabled: true,
    namespace: policyNamespace,
    package: { name: packageName, version: pkgVersion },
    ...(vars ? { vars } : {}),
    inputs,
    policy_ids: selectedAgentPolicyIds,
  } as unknown as Parameters<typeof sendUpdatePackagePolicy>[1]);
}
