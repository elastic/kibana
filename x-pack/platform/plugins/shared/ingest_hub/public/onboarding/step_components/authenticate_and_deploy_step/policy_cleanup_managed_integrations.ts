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
import {
  detectSecretRefs,
  fetchAgentlessSecretRefs,
  withoutCoveredCredentials,
} from './secret_refs';
import type { ExistingSecretRefs } from './secret_refs';
import { runWithSharedSecrets } from './shared_secrets';
import { computePolicyCleanupOps, resolveSurvivingMembers } from './policy_cleanup';
import type { BuildPolicyBodyOpts, PolicyCleanupOps } from './policy_cleanup';

export interface CleanupManagedIntegrationsOpts extends BuildPolicyBodyOpts {
  pendingCleanupPolicyIds: Record<string, string>;
  currentPolicyIdsByInstance: Record<string, string>;
  /** Instances joining a policy in this run: written with its surviving members, in one PUT. */
  extraMembersByPolicy?: Record<string, string[]>;
  /** Policies already written this run with the surviving members: counted as updated, not PUT again. */
  skipUpdatePolicyIds?: ReadonlySet<string>;
}

/**
 * Delete or update managed-integrations (agentless) policies for removed services.
 * Best-effort: individual failures are logged but do not block the deploy.
 * Returns only the ops that actually succeeded so callers can selectively clear
 * pendingCleanupPolicyIds — a failed cleanup remains staged for retry.
 */
export async function cleanupManagedIntegrationsPolicies(
  opts: CleanupManagedIntegrationsOpts
): Promise<PolicyCleanupOps & { sharedRefs?: ExistingSecretRefs }> {
  const {
    pendingCleanupPolicyIds,
    currentPolicyIdsByInstance,
    authenticateAndDeployStep,
    extraMembersByPolicy,
    skipUpdatePolicyIds,
  } = opts;
  const planned = computePolicyCleanupOps(pendingCleanupPolicyIds, currentPolicyIdsByInstance);

  const succeededDeletes: string[] = [];
  const succeededUpdates: Array<{ policyId: string; survivingInstanceIds: string[] }> = [];
  const alreadyUpdated = planned.toUpdate.filter(({ policyId }) =>
    skipUpdatePolicyIds?.has(policyId)
  );
  const toRun = planned.toUpdate.filter(({ policyId }) => !skipUpdatePolicyIds?.has(policyId));

  const { connectorId, staticKeys, existingSecretRefs } = authenticateAndDeployStep;
  // Typed keys become a new Fleet secret on every policy they are sent to: store them once and
  // have the remaining updates (and the caller's later ones) use that secret.
  const hasTypedSecrets =
    !connectorId &&
    !existingSecretRefs?.size &&
    Boolean(staticKeys?.access_key_id || staticKeys?.secret_access_key);

  const deletes = Promise.allSettled(
    planned.toDelete.map((policyId) =>
      sendDeleteAgentlessPolicy(policyId)
        .then(() => {
          succeededDeletes.push(policyId);
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error(`Failed to delete managed-integrations policy ${policyId}:`, err);
        })
    )
  );
  const updates = runWithSharedSecrets({
    items: toRun,
    hasTypedSecrets,
    // An update can delete the secret it replaced: finish one before starting the next.
    sequential: true,
    run: ({ policyId, survivingInstanceIds }, sharedRefs) =>
      updateManagedIntegrationsPolicy(
        policyId,
        [...survivingInstanceIds, ...(extraMembersByPolicy?.[policyId] ?? [])],
        sharedRefs
          ? {
              ...opts,
              authenticateAndDeployStep: {
                ...authenticateAndDeployStep,
                staticKeys: staticKeys && withoutCoveredCredentials(staticKeys, sharedRefs),
                existingSecretRefs: sharedRefs,
              },
            }
          : opts
      ),
    getPolicyId: ({ policyId }) => policyId,
    fetchRefs: fetchAgentlessSecretRefs,
  });

  const [, { results, sharedRefs }] = await Promise.all([deletes, updates]);
  succeededUpdates.push(...alreadyUpdated);
  results.forEach((result, i) => {
    const { policyId, survivingInstanceIds } = toRun[i];
    if (result.status === 'fulfilled') {
      succeededUpdates.push({ policyId, survivingInstanceIds });
    } else {
      // eslint-disable-next-line no-console
      console.error(`Failed to update managed-integrations policy ${policyId}:`, result.reason);
    }
  });

  return { toDelete: succeededDeletes, toUpdate: succeededUpdates, sharedRefs };
}

export async function updateManagedIntegrationsPolicy(
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
  // Treat a missing package as a failure so callers do not count the update as successful and
  // clear isDirty for a policy that was never actually updated.
  if (!pkgVersion || !pkgInfo) {
    throw new Error(
      `Cannot update managed-integration policy ${policyId}: package info unavailable for ${packageName}@${
        existingVersion ?? 'latest'
      }.`
    );
  }

  const serviceVarsMap: Record<string, ServiceVars> = {};
  for (const { instance, service } of members) {
    serviceVarsMap[service.id] = storedServiceVars[instance.instanceId] ?? {
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

  const policyName = existingName ?? `${packageName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}`;
  const policyNamespace = existingNamespace ?? namespace;

  // Use the override connector when the caller explicitly provides one (e.g. a dirty redeploy
  // that changed identity federation settings). Otherwise preserve the connector already on the
  // policy — a Fleet operator may have reassigned it since the wizard ran.
  const rawConnector =
    'overrideCloudConnector' in opts
      ? opts.overrideCloudConnector
      : existingGetResult.item.cloud_connector;
  // Normalise: the GET response may return a legacy string ID for cloud_connector; the PUT
  // endpoint expects the object form { enabled: boolean, cloud_connector_id?: string }.
  const cloudConnector =
    rawConnector == null || typeof rawConnector !== 'string'
      ? rawConnector
      : ({ enabled: true, cloud_connector_id: rawConnector } as const);

  // The PUT is a full replace, so credentials the user did not retype must be sent back as the
  // policy's own secret refs or Fleet deletes the stored secrets. Not applicable once the policy
  // authenticates through a cloud connector.
  const vars = buildPackageVars(
    globalRegion,
    staticKeys,
    pkgVarNames,
    undefined,
    cloudConnector
      ? undefined
      : authenticateAndDeployStep.existingSecretRefs ?? detectSecretRefs(existingGetResult.item)
  );

  await sendUpdateAgentlessPolicy(policyId, {
    name: policyName,
    namespace: policyNamespace,
    package: { name: packageName, version: pkgVersion },
    ...(vars ? { vars } : {}),
    inputs,
    // null means "detach" (same as omitting — per Fleet schema); undefined means "preserve". Use
    // !== undefined rather than truthiness so an intentional null reaches the wire explicitly.
    ...(cloudConnector !== undefined ? { cloud_connector: cloudConnector } : {}),
  });
}
