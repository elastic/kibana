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
import { detectSecretRefs } from './secret_refs';
import type { ExistingSecretRefs } from './secret_refs';
import type { AgentCredentialVars } from './package_inputs';
import { computePolicyCleanupOps, resolveSurvivingMembers } from './policy_cleanup';
import type { BuildPolicyBodyOpts, PolicyCleanupOps } from './policy_cleanup';

export interface UpdateAgentBasedPolicyOpts extends BuildPolicyBodyOpts {
  selectedAgentPolicyIds: string[];
  agentCredentials?: AgentCredentialVars;
}

export interface CleanupAgentBasedOpts extends UpdateAgentBasedPolicyOpts {
  pendingCleanupPolicyIds: Record<string, string>;
  currentPolicyIdsByInstance: Record<string, string>;
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
          console.error(`Failed to delete agent-based package policy ${policyId}:`, err);
        })
    ),
    ...planned.toUpdate.map(({ policyId, survivingInstanceIds }) =>
      updateAgentBasedPolicy(policyId, survivingInstanceIds, opts)
        .then(() => {
          succeededUpdates.push({ policyId, survivingInstanceIds });
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error(`Failed to update agent-based package policy ${policyId}:`, err);
        })
    ),
  ]);

  return { toDelete: succeededDeletes, toUpdate: succeededUpdates };
}

export async function updateAgentBasedPolicy(
  policyId: string,
  survivingInstanceIds: string[],
  opts: UpdateAgentBasedPolicyOpts
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
  if (!members) {
    throw new Error(
      `Cannot update agent-based policy ${policyId}: one or more surviving instance IDs could not be resolved — leaving it pending for retry.`
    );
  }

  const packageName = members[0].service.packageName;

  // Fetch existing package policy to preserve its name, namespace, and credential vars.
  let existingName: string | undefined;
  let existingNamespace: string | undefined;
  let existingVersion: string | undefined;
  let existingPolicyIds: string[] | undefined;
  // Fleet can return password vars as a secret reference: { isSecretRef: true, id: '...' }.
  // Preserve both plain strings and secret refs so a service-var-only dirty redeploy does not
  // send an empty vars block that clears AWS credentials already stored as Fleet secrets.
  type ExistingVarValue = string | { isSecretRef: boolean; id: string };
  const existingVarValues: Record<string, ExistingVarValue> = {};
  let existingSecretRefs: ExistingSecretRefs | undefined;
  try {
    const existing = await sendGetOnePackagePolicy(policyId);
    if (existing.error) throw existing.error;
    existingName = existing.data?.item?.name;
    existingNamespace = existing.data?.item?.namespace;
    existingVersion = existing.data?.item?.package?.version;
    existingPolicyIds = existing.data?.item?.policy_ids;
    existingSecretRefs = detectSecretRefs(existing.data?.item);
    for (const [key, entry] of Object.entries(
      (existing.data?.item?.vars ?? {}) as Record<string, { value: unknown }>
    )) {
      const v = entry?.value;
      if (typeof v === 'string') {
        existingVarValues[key] = v;
      } else if (
        v &&
        typeof v === 'object' &&
        (v as Record<string, unknown>).isSecretRef === true
      ) {
        existingVarValues[key] = v as { isSecretRef: boolean; id: string };
      }
    }
  } catch {
    throw new Error(
      `Cannot safely update agent-based policy ${policyId}: failed to fetch existing metadata.`
    );
  }

  const pkgInfoResponse = await sendGetPackageInfoByKey(packageName, existingVersion);
  const pkgInfo = pkgInfoResponse.data?.item;
  const pkgVersion = pkgInfo?.version;
  if (!pkgVersion || !pkgInfo)
    throw new Error(
      `Cannot safely update agent-based policy ${policyId}: package info unavailable for ${packageName}.`
    );

  const serviceVarsMap: Record<string, ServiceVars> = {};
  for (const { instance, service } of members) {
    serviceVarsMap[service.id] = storedServiceVars[instance.instanceId] ?? {
      enabledDataStreams: service.dataStreams,
      varsByDataStream: {},
    };
  }

  const services = members.map(({ service }) => service);
  const inputs = buildPackageInputs(services, serviceVarsMap, globalRegion);

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
  const builtVars = buildPackageVars(
    globalRegion,
    staticKeys,
    pkgVarNames,
    agentCredentials,
    authenticateAndDeployStep.existingSecretRefs ?? existingSecretRefs
  );
  // When new credentials are explicitly provided, use only the newly built vars — merging the
  // existing values would retain stale fields from the old credential method (e.g. access_key_id
  // left over after switching to shared_credentials). When no credentials are in memory (access/
  // temp keys are memory-only and lost after reload), merge existing vars as a base so a
  // service-var-only dirty redeploy does not silently clear credential fields from the policy.
  let vars: Record<string, string | { isSecretRef: boolean; id: string }> | undefined;
  if (agentCredentials) {
    vars = builtVars;
  } else {
    const mergedVars = { ...existingVarValues, ...(builtVars ?? {}) };
    vars = Object.keys(mergedVars).length > 0 ? mergedVars : undefined;
  }

  const policyName = existingName ?? `${packageName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}`;
  const policyNamespace = existingNamespace ?? namespace;

  // Simplified-schema PUT: inputs is a record (keyed by `<ptName>-<inputType>`).
  // The legacy schema accepts `enabled` at the top level but requires inputs as an array.
  // The simplified schema accepts record inputs but rejects unknown top-level keys like `enabled`.
  // Use simplified consistently — `enabled` is intentionally omitted.
  // sendUpdatePackagePolicy resolves with { error } on HTTP failure rather than rejecting.
  // Throw explicitly so Promise.allSettled callers can detect the failure.
  const updateResult = await sendUpdatePackagePolicy(policyId, {
    name: policyName,
    namespace: policyNamespace,
    package: { name: packageName, version: pkgVersion },
    ...(vars ? { vars } : {}),
    inputs,
    // A non-empty selectedAgentPolicyIds is an explicit override (policy-selection drift);
    // otherwise keep the policy's current policy_ids so agent policies attached outside the
    // wizard are not detached.
    policy_ids:
      selectedAgentPolicyIds.length > 0 ? selectedAgentPolicyIds : existingPolicyIds ?? [],
  } as unknown as Parameters<typeof sendUpdatePackagePolicy>[1]);
  if (updateResult.error) {
    throw updateResult.error;
  }
}
