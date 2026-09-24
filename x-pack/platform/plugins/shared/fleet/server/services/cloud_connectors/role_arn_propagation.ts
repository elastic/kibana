/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSavedObjectErrorResult,
  SavedObjectsErrorHelpers,
  type AuthenticatedUser,
  type ElasticsearchClient,
  type SavedObjectsClientContract,
} from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { isEqual, omit } from 'lodash';
import pMap from 'p-map';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { NewPackagePolicy, PackagePolicy } from '../../../common/types';
import { MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS } from '../../constants';
import { CloudConnectorRoleArnPropagationError } from '../../errors';
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';
import { getAgentTemplateAssetsMap, getPackageInfo } from '../epm/packages/get';
import {
  _compilePackagePolicyInputs,
  getPackagePolicySavedObjectType,
  packagePolicyService,
  toPackagePolicyUpdate,
  _normalizePackagePolicyKuery,
} from '../package_policy';
import { escapeSearchQueryPhrase } from '../saved_object';

import type { PackagePolicySOAttributes } from '../../types/so_attributes';

import { policyHoldsRoleArn, rewritePolicyRoleArn } from './update_input_vars_with_role_arn';

interface PropagateArgs {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  connectorId: string;
  newRoleArn: string;
  /** When set, package-policy updates record this user instead of `updated_by: system`. */
  user?: AuthenticatedUser;
}

interface SnapshotPlan {
  id: string;
  version?: string;
  package: PackagePolicySOAttributes['package'];
  previousVars: PackagePolicySOAttributes['vars'];
  previousInputs: PackagePolicySOAttributes['inputs'];
  previousInputsForVersions: PackagePolicySOAttributes['inputs_for_versions'];
  updatedVars: PackagePolicySOAttributes['vars'];
  updatedInputs: PackagePolicySOAttributes['inputs'];
  updatedInputsForVersions: PackagePolicySOAttributes['inputs_for_versions'];
  writeVersion?: string;
}

interface PolicyPlan {
  policy: PackagePolicy;
  previousVars: NewPackagePolicy['vars'];
  updatedVars: NewPackagePolicy['vars'];
  previousInputs: NewPackagePolicy['inputs'];
  updatedInputs: NewPackagePolicy['inputs'];
  /**
   * Optimistic-concurrency token for the *next* write. Forward writes use the version from the
   * PIT fetch; after a successful forward write we store the returned policy's version so the
   * revert write does not clobber a concurrent edit either.
   */
  writeVersion?: string;
}

/**
 * Snapshot-exact undo for a successful fan-out. Returned so the caller can restore policies if
 * the subsequent connector write fails — without re-fanning a single global `oldRoleArn` that
 * would erase per-policy drift captured before the forward write.
 */
export interface RoleArnPropagationRollback {
  readonly policyCount: number;
  revert(): Promise<void>;
}

/** Ids rendered inline in the thrown message; `detail.updateFailed` always carries the full list. */
const MAX_RENDERED_POLICY_IDS = 20;

const renderPolicyIds = (ids: string[]): string => {
  const shown = ids.slice(0, MAX_RENDERED_POLICY_IDS);
  const remaining = ids.length - shown.length;
  return remaining > 0 ? `${shown.join(', ')}, +${remaining} more` : shown.join(', ');
};

/**
 * The fields a Role ARN write sends, without the compiled output the service regenerates or the
 * `experimental_data_stream_features` that `packagePolicyService.get` adds from the installation.
 */
const writtenFields = (
  policy: PackagePolicy,
  vars: NewPackagePolicy['vars'],
  inputs: NewPackagePolicy['inputs']
) => ({
  ...toPackagePolicyUpdate(policy),
  ...(policy.package ? { package: omit(policy.package, 'experimental_data_stream_features') } : {}),
  vars,
  inputs: inputs.map((input) => ({
    ...omit(input, 'compiled_input'),
    streams: input.streams.map((stream) => omit(stream, 'compiled_stream')),
  })),
});

/** True when every field the plan's forward write sent is still what the policy stores. */
const policyHoldsPlannedWrite = (current: PackagePolicy, plan: PolicyPlan): boolean =>
  isEqual(
    writtenFields(current, current.vars, current.inputs),
    writtenFields(plan.policy, plan.updatedVars, plan.updatedInputs)
  );

/**
 * Fan out a new role ARN to every package policy that references this connector **in
 * `soClient`'s Kibana space**.
 *
 * A connector shared into other spaces is handled by the caller: it checks the caller can write
 * integration policies in each space, then calls this once per space with a client scoped to
 * that space. This function stays on `soClient` and does not query `spaceIds: ['*']`.
 *
 * Semantics: "policies first, then connector; on any policy failure, revert successful policies."
 * The caller writes the connector AFTER a successful call to this function. Idempotent: policies
 * that carry no `role_arn` variable (or already hold the new value) at any of top-level
 * `packagePolicy.vars`, input-level `vars`, or per-stream `vars` are silently skipped.
 *
 * Exit points (in source order):
 *   1. `return undefined` — neither an active policy nor a `:prev` snapshot holds a `role_arn`
 *      that needs rewriting for this connector.
 *   2. `throw`  — one or more referencing policies lack a `package` (cannot be updated).
 *   3. `throw` — one or more policies (or `:prev` snapshots) are managed. `packagePolicyService.update`
 *      rejects those only when the payload sets `is_managed`, so the fan-out also refuses them
 *      before any write.
 *   4. `return RoleArnPropagationRollback` — Phase 1 forward writes all succeeded and the
 *      agent-policy revision bump succeeded. Caller is safe to write the connector; on that
 *      write's failure call `rollback.revert()` to restore exact per-policy snapshots.
 *   5. `throw`  — Phase 1 had policy failures, or the post-Phase-1 agent-policy bump failed;
 *      successful policy writes are reverted and `CloudConnectorRoleArnPropagationError` is
 *      thrown with `updateFailed` / `revertFailed` id lists. Caller must NOT write the connector.
 */
export const propagateRoleArnToPackagePolicies = async ({
  soClient,
  esClient,
  connectorId,
  newRoleArn,
  user,
}: PropagateArgs): Promise<RoleArnPropagationRollback | undefined> => {
  const logger = appContextService.getLogger().get('propagateRoleArnToPackagePolicies');
  const spaceId = soClient.getCurrentNamespace() ?? DEFAULT_SPACE_ID;

  // Deliberately unfiltered, unlike the browser's `useCloudConnectorUsage`, which hides
  // CLOUD_CONNECTOR_HIDDEN_PACKAGES (the permission verifier) from the count shown before saving:
  // the verifier policy has to move to the new role too, or it would keep checking the old one.
  // The user-facing count therefore under-reports what this rewrites.
  const kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id:${escapeSearchQueryPhrase(
    connectorId
  )}`;

  // `fetchAllItems` pages under a Point-In-Time snapshot, so we neither cap at SO_SEARCH_LIMIT
  // (a heavy-usage connector would silently keep the tail on the old ARN) nor race with a
  // concurrent policy edit (the connector write below would then disagree with what got
  // rewritten here). Scoped to `soClient`'s space — same visibility as the PUT that triggered us.
  const policies: PackagePolicy[] = [];
  for await (const page of await packagePolicyService.fetchAllItems(soClient, { kuery })) {
    policies.push(...page);
  }

  // ── Plan ────────────────────────────────────────────────────────────────────────────────────
  // Compute the pre/post snapshots in memory. Anything that doesn't actually change is dropped
  // here so Phases 1 and 2 only touch policies that need it.
  const plans = policies
    .map((policy): PolicyPlan | null => {
      const { vars, inputs, changed } = rewritePolicyRoleArn(policy, newRoleArn);
      return changed
        ? {
            policy,
            previousVars: policy.vars,
            updatedVars: vars,
            previousInputs: policy.inputs,
            updatedInputs: inputs,
          }
        : null;
    })
    .filter((plan): plan is PolicyPlan => plan !== null);

  const managedSnapshotIds: string[] = [];
  const PREVIOUS_REVISION_PAGE_SIZE = 100;
  // Package policies (and their `:prev` snapshots) live under the legacy type while space
  // awareness is off.
  const packagePolicySavedObjectType = await getPackagePolicySavedObjectType();

  /**
   * `packagePolicyService.fetchAllItems` hides `latest_revision:false` objects. Package rollback
   * copies those `:prev` attributes back onto the active policy, so a snapshot that still holds
   * the old ARN would redeploy it after this connector has moved on.
   */
  const findPreviousRevisionSnapshots = async (): Promise<SnapshotPlan[]> => {
    const filter = _normalizePackagePolicyKuery(
      packagePolicySavedObjectType,
      `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id:${escapeSearchQueryPhrase(
        connectorId
      )} AND ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.latest_revision:false`
    );
    const plansForSnapshots: SnapshotPlan[] = [];
    let page = 1;
    for (;;) {
      const response = await soClient.find<PackagePolicySOAttributes>({
        type: packagePolicySavedObjectType,
        page,
        perPage: PREVIOUS_REVISION_PAGE_SIZE,
        filter,
      });
      const objects = response?.saved_objects ?? [];
      for (const savedObject of objects) {
        if (!savedObject.id.endsWith(':prev')) {
          continue;
        }
        const attributes = savedObject.attributes;
        const { vars, inputs, changed } = rewritePolicyRoleArn(
          { vars: attributes.vars, inputs: attributes.inputs ?? [] },
          newRoleArn
        );
        if (!changed) {
          continue;
        }
        // Snapshot writes go through `soClient.update`, which has no managed-policy guard.
        // Collect them here so the fan-out can refuse the whole rewrite before any mutation.
        if (attributes.is_managed) {
          managedSnapshotIds.push(savedObject.id);
        }
        plansForSnapshots.push({
          id: savedObject.id,
          version: savedObject.version,
          package: attributes.package,
          previousVars: attributes.vars,
          previousInputs: attributes.inputs,
          previousInputsForVersions: attributes.inputs_for_versions,
          updatedVars: vars,
          updatedInputs: inputs,
          updatedInputsForVersions: attributes.inputs_for_versions,
        });
      }
      const total = response?.total ?? objects.length;
      if (objects.length === 0 || page * PREVIOUS_REVISION_PAGE_SIZE >= total) {
        break;
      }
      page += 1;
    }
    return plansForSnapshots;
  };

  /**
   * Rollback copies `compiled_input`, `compiled_stream` and `inputs_for_versions` onto the active
   * policy without compiling again, so each rewritten snapshot is compiled against its own
   * package version here.
   */
  const recompileSnapshot = async (plan: SnapshotPlan): Promise<SnapshotPlan> => {
    if (!plan.package) {
      throw new Error(`Rollback snapshot ${plan.id} has no package to compile against`);
    }
    const packageInfo = await getPackageInfo({
      savedObjectsClient: soClient,
      pkgName: plan.package.name,
      pkgVersion: plan.package.version,
      prerelease: true,
    });
    const assetsMap = await getAgentTemplateAssetsMap({
      savedObjectsClient: soClient,
      packageInfo,
      logger,
    });
    const vars = plan.updatedVars ?? {};
    const updatedInputs = _compilePackagePolicyInputs(
      packageInfo,
      vars,
      plan.updatedInputs ?? [],
      assetsMap
    );
    const updatedInputsForVersions = plan.previousInputsForVersions
      ? Object.fromEntries(
          Object.keys(plan.previousInputsForVersions).map((agentVersion) => [
            agentVersion,
            _compilePackagePolicyInputs(packageInfo, vars, updatedInputs, assetsMap, agentVersion),
          ])
        )
      : undefined;
    return { ...plan, updatedInputs, updatedInputsForVersions };
  };

  const recompileSnapshotPlans = async (
    toRecompile: SnapshotPlan[]
  ): Promise<{ recompiled: SnapshotPlan[]; failed: string[] }> => {
    const failed: string[] = [];
    const recompiled: SnapshotPlan[] = [];
    await pMap(
      toRecompile,
      async (plan) => {
        try {
          recompiled.push(await recompileSnapshot(plan));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(
            `Failed to compile package policy rollback snapshot ${plan.id} with new role ARN: ${message}`
          );
          failed.push(plan.id);
        }
      },
      { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS, stopOnError: false }
    );
    return { recompiled, failed: failed.sort() };
  };

  const writeSnapshot = (
    plan: SnapshotPlan,
    vars: PackagePolicySOAttributes['vars'],
    inputs: PackagePolicySOAttributes['inputs'],
    inputsForVersions: PackagePolicySOAttributes['inputs_for_versions'],
    version?: string
  ) =>
    soClient.update<PackagePolicySOAttributes>(
      packagePolicySavedObjectType,
      plan.id,
      {
        vars,
        inputs,
        ...(inputsForVersions !== undefined ? { inputs_for_versions: inputsForVersions } : {}),
      },
      version !== undefined ? { version } : undefined
    );

  const applySnapshotPlans = async (
    toApply: SnapshotPlan[]
  ): Promise<{ succeeded: SnapshotPlan[]; failed: string[] }> => {
    const failed: string[] = [];
    const succeeded: SnapshotPlan[] = [];
    await pMap(
      toApply,
      async (plan) => {
        try {
          const updated = await writeSnapshot(
            plan,
            plan.updatedVars,
            plan.updatedInputs,
            plan.updatedInputsForVersions,
            plan.version
          );
          succeeded.push({ ...plan, writeVersion: updated?.version });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(
            `Failed to update package policy rollback snapshot ${plan.id} with new role ARN: ${message}`
          );
          failed.push(plan.id);
        }
      },
      { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS, stopOnError: false }
    );
    return { succeeded, failed };
  };

  const revertSnapshotPlans = async (toRevert: SnapshotPlan[]): Promise<string[]> => {
    const revertFailed: string[] = [];
    await pMap(
      toRevert,
      async (plan) => {
        try {
          await writeSnapshot(
            plan,
            plan.previousVars,
            plan.previousInputs,
            plan.previousInputsForVersions,
            plan.writeVersion
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(
            `Failed to revert package policy rollback snapshot ${plan.id} to previous role ARN: ${message}`
          );
          revertFailed.push(plan.id);
        }
      },
      { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS, stopOnError: false }
    );
    return revertFailed;
  };

  const foundSnapshotPlans = await findPreviousRevisionSnapshots();

  // A policy that moved off this connector can still have a `:prev` snapshot referencing it, so
  // the snapshot lookup runs even when no active policy references the connector.
  if (plans.length === 0 && foundSnapshotPlans.length === 0) {
    logger.debug(
      `Connector ${connectorId} has ${policies.length} referencing package policies and no rollback snapshots with a role_arn to rewrite; nothing to fan out.`
    );
    return undefined; // exit 1: nothing holds a role_arn to rewrite
  }

  // packagePolicyService.update unconditionally rejects policies without a package. Attempting
  // the write would fail the whole fan-out mid-flight; fail fast before any SO mutation.
  const packagelessIds = plans
    .filter((plan) => !plan.policy.package)
    .map((plan) => plan.policy.id)
    .sort();
  if (packagelessIds.length > 0) {
    throw new CloudConnectorRoleArnPropagationError(
      `Cannot fan out role ARN for connector ${connectorId}: ${packagelessIds.length} package ${
        packagelessIds.length === 1 ? 'policy lacks' : 'policies lack'
      } a package and cannot be updated (ids: ${renderPolicyIds(packagelessIds)}).`,
      { updateFailed: packagelessIds, revertFailed: [], bumpFailed: false }
    );
  }

  // Managed policies are immutable unless the caller passes `force`. Fail before any write so a
  // mixed set does not update the unmanaged policies and then have to roll them back.
  const managedIds = [
    ...plans.filter((plan) => plan.policy.is_managed).map((plan) => plan.policy.id),
    ...managedSnapshotIds,
  ].sort();
  if (managedIds.length > 0) {
    throw new CloudConnectorRoleArnPropagationError(
      `Cannot fan out role ARN for connector ${connectorId}: ${managedIds.length} managed package ${
        managedIds.length === 1 ? 'policy cannot' : 'policies cannot'
      } be updated (ids: ${renderPolicyIds(managedIds)}).`,
      { updateFailed: managedIds, revertFailed: [], bumpFailed: false }
    );
  }

  const { recompiled: snapshotPlans, failed: uncompilableSnapshotIds } =
    await recompileSnapshotPlans(foundSnapshotPlans);
  if (uncompilableSnapshotIds.length > 0) {
    throw new CloudConnectorRoleArnPropagationError(
      `Cannot fan out role ARN for connector ${connectorId}: ${
        uncompilableSnapshotIds.length
      } package policy rollback ${
        uncompilableSnapshotIds.length === 1 ? 'snapshot' : 'snapshots'
      } could not be compiled with the new role ARN (ids: ${renderPolicyIds(
        uncompilableSnapshotIds
      )}).`,
      { updateFailed: uncompilableSnapshotIds, revertFailed: [], bumpFailed: false }
    );
  }

  if (plans.length > 0) {
    logger.info(
      `Fanning out new role ARN to ${plans.length} package ${
        plans.length === 1 ? 'policy' : 'policies'
      } referencing connector ${connectorId}.`
    );
  }

  const writePolicyRoleArn = (
    plan: PolicyPlan,
    vars: NewPackagePolicy['vars'],
    inputs: NewPackagePolicy['inputs'],
    version?: string
  ) =>
    packagePolicyService.update(
      soClient,
      esClient,
      plan.policy.id,
      {
        ...toPackagePolicyUpdate(plan.policy),
        // The service rejects managed policies only when the incoming payload sets this flag,
        // not from the stored policy. Keep it so a managed policy cannot be rewritten as if it
        // were unmanaged.
        ...(plan.policy.is_managed ? { is_managed: true } : {}),
        vars,
        inputs,
        // `packagePolicyService.update` passes this through to `soClient.update` as the OCC
        // token. Without it a concurrent edit between the PIT read and this write is silently
        // overwritten by the stale vars/inputs payload.
        ...(version !== undefined ? { version } : {}),
      },
      // Policies sharing an agent policy would each read-modify-write the same `revision`
      // concurrently; the whole fan-out is bumped once below instead.
      { bumpRevision: false, ...(user !== undefined ? { user } : {}) }
    );

  /**
   * Bumps every agent policy referenced by `bumped`. Throws on failure — with
   * `bumpRevision: false` on every package-policy write, this is the only deployment
   * trigger in the fan-out; swallowing it would report success while agents keep the
   * old compiled ARN indefinitely.
   */
  const bumpAgentPolicies = async (bumped: PolicyPlan[]): Promise<void> => {
    const agentPolicyIds = new Set<string>();
    for (const { policy } of bumped) {
      for (const agentPolicyId of policy.policy_ids ?? []) {
        agentPolicyIds.add(agentPolicyId);
      }
    }
    if (agentPolicyIds.size === 0) {
      return;
    }
    const ids = [...agentPolicyIds].sort();
    const response = await agentPolicyService.bumpAgentPoliciesByIds(
      ids,
      user ? { user } : {},
      spaceId
    );
    // bulkUpdate resolves with per-object errors (for example an OCC conflict) instead of
    // rejecting. Awaiting the call without reading those results reports a successful fan-out
    // while some agents stay on the old compiled ARN.
    // bumpAgentPoliciesByIds also drops ids its bulkGet could not read, without an error entry,
    // so a requested id missing from the response was never bumped either.
    const results = response?.saved_objects ?? [];
    const failures = results
      .filter(isSavedObjectErrorResult)
      .map((so) => `${so.id}: ${so.error?.message ?? 'unknown error'}`);
    const bumpedIds = new Set(
      results.filter((so) => !isSavedObjectErrorResult(so)).map((so) => so.id)
    );
    const erroredIds = new Set(results.filter(isSavedObjectErrorResult).map((so) => so.id));
    for (const id of ids) {
      if (!bumpedIds.has(id) && !erroredIds.has(id)) {
        failures.push(`${id}: not found or not readable`);
      }
    }
    if (failures.length > 0) {
      throw new Error(
        `Failed to bump ${failures.length} agent ${
          failures.length === 1 ? 'policy' : 'policies'
        } (${failures.join('; ')})`
      );
    }
  };

  /** Best-effort write of each plan's previous vars/inputs; collects successes and failures. */
  const revertPlans = async (
    toRevert: PolicyPlan[]
  ): Promise<{ reverted: PolicyPlan[]; revertFailed: string[] }> => {
    const revertFailed: string[] = [];
    const reverted: PolicyPlan[] = [];
    await pMap(
      toRevert,
      async (plan) => {
        try {
          await writePolicyRoleArn(plan, plan.previousVars, plan.previousInputs, plan.writeVersion);
          reverted.push(plan);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(
            `Failed to revert package policy ${plan.policy.id} to previous role ARN: ${message}`
          );
          revertFailed.push(plan.policy.id);
        }
      },
      { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS, stopOnError: false }
    );
    return { reverted, revertFailed };
  };

  // ── Phase 1: forward writes (plans → new ARN) ──────────────────────────────────────────────
  // pMap swallows per-plan errors into `updateFailed` so control flow after the pMap can decide
  // between the happy exit and the revert phase; `stopOnError: false` guarantees every plan
  // settles before that decision is made.
  //
  // `packagePolicyService.update` persists the SO before later compilation / secret cleanup /
  // post-update callbacks. A rejection after that persist would leave the policy on the new ARN
  // while classifying it as `updateFailed` (and therefore out of Phase 2). On a non-conflict
  // error we re-read and, if the policy still stores exactly what this write sent, add the plan
  // to `succeeded` so Phase 2 reverts it too. If anything else changed since, the re-read
  // version belongs to another edit that a snapshot restore would erase, so the policy is
  // reported as left on the new ARN instead.
  //
  // An optimistic-concurrency conflict is different: this request's write was rejected, so a
  // re-read that shows the new ARN means another writer stored it. Role ARN saves on a connector
  // are serialized by a lock, so that writer is not a connector save: the policy is not ours to
  // revert, and if this fan-out is rolled back it is reported as left on the new ARN.
  const updateFailed: string[] = [];
  const succeeded: PolicyPlan[] = [];
  const changedByOtherWriter: string[] = [];

  await pMap(
    plans,
    async (plan) => {
      try {
        const updated = await writePolicyRoleArn(
          plan,
          plan.updatedVars,
          plan.updatedInputs,
          plan.policy.version
        );
        succeeded.push({ ...plan, writeVersion: updated.version });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(
          `Failed to update package policy ${plan.policy.id} with new role ARN: ${message}`
        );

        const isConflict = SavedObjectsErrorHelpers.isConflictError(error);
        try {
          const current = await packagePolicyService.get(soClient, plan.policy.id);
          if (current && policyHoldsRoleArn(current, newRoleArn)) {
            if (isConflict) {
              changedByOtherWriter.push(plan.policy.id);
              return;
            }
            // SO write landed (every role_arn field is already the new value) and a later step
            // rejected. Do not use bare `!changed` — that is also true when a concurrent edit
            // removed all Role ARN fields.
            if (policyHoldsPlannedWrite(current, plan)) {
              succeeded.push({ ...plan, writeVersion: current.version });
            } else {
              changedByOtherWriter.push(plan.policy.id);
            }
          }
        } catch (reReadError) {
          const reReadMessage =
            reReadError instanceof Error ? reReadError.message : String(reReadError);
          logger.error(
            `Could not re-read package policy ${plan.policy.id} after a failed role ARN update to decide whether to revert: ${reReadMessage}`
          );
        }
        updateFailed.push(plan.policy.id);
      }
    },
    { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS, stopOnError: false }
  );

  if (updateFailed.length === 0) {
    try {
      await bumpAgentPolicies(succeeded);
    } catch (bumpError) {
      // Policies already hold the new ARN; without a bump agents keep the old compiled one.
      // Revert so the connector write below never runs against a half-applied fan-out.
      const bumpMessage = bumpError instanceof Error ? bumpError.message : String(bumpError);
      logger.error(
        `Failed to bump agent policy revisions in space ${spaceId} after the role ARN fan-out for connector ${connectorId}: ${bumpMessage}. Reverting package policies.`
      );

      const { reverted, revertFailed } = await revertPlans(succeeded);
      let bumpFailed = false;
      try {
        await bumpAgentPolicies(reverted);
      } catch (revertBumpError) {
        bumpFailed = true;
        const revertBumpMessage =
          revertBumpError instanceof Error ? revertBumpError.message : String(revertBumpError);
        logger.error(
          `Failed to bump agent policy revisions after reverting the role ARN fan-out for connector ${connectorId}: ${revertBumpMessage}`
        );
      }

      const failedIds = succeeded.map((plan) => plan.policy.id).sort();
      revertFailed.sort();
      throw new CloudConnectorRoleArnPropagationError(
        `Failed to bump agent policy revisions after updating role ARN on ${
          failedIds.length
        } package ${failedIds.length === 1 ? 'policy' : 'policies'} for connector ${connectorId}` +
          ` (ids: ${renderPolicyIds(failedIds)}): ${bumpMessage}` +
          (revertFailed.length > 0
            ? `. Revert also failed for ${revertFailed.length} previously updated ${
                revertFailed.length === 1 ? 'policy' : 'policies'
              } (ids: ${renderPolicyIds(
                revertFailed
              )}); those policies are now on the new role ARN while the connector still holds the old one.`
            : `. All previously updated policies were reverted successfully; the connector is unchanged.`) +
          (bumpFailed
            ? ` Agent policy revision bump after revert also failed; agents may still hold a stale compiled role ARN.`
            : ''),
        { updateFailed: failedIds, revertFailed, bumpFailed }
      );
    }

    logger.info(
      `Successfully fanned out new role ARN to ${succeeded.length} package ${
        succeeded.length === 1 ? 'policy' : 'policies'
      }.`
    );

    const { succeeded: committedSnapshots, failed: snapshotFailed } = await applySnapshotPlans(
      snapshotPlans
    );
    if (snapshotFailed.length > 0) {
      const snapshotRevertFailed = await revertSnapshotPlans(committedSnapshots);
      const { reverted, revertFailed } = await revertPlans(succeeded);
      let bumpFailed = false;
      try {
        await bumpAgentPolicies(reverted);
      } catch (bumpError) {
        bumpFailed = true;
        const bumpMessage = bumpError instanceof Error ? bumpError.message : String(bumpError);
        logger.error(
          `Failed to bump agent policy revisions after reverting a failed rollback-snapshot fan-out for connector ${connectorId}: ${bumpMessage}`
        );
      }
      snapshotFailed.sort();
      snapshotRevertFailed.sort();
      revertFailed.sort();
      throw new CloudConnectorRoleArnPropagationError(
        `Failed to update role ARN on ${snapshotFailed.length} package policy rollback ${
          snapshotFailed.length === 1 ? 'snapshot' : 'snapshots'
        } for connector ${connectorId} (ids: ${renderPolicyIds(snapshotFailed)}).` +
          (snapshotRevertFailed.length + revertFailed.length > 0
            ? ` Revert also failed for ${renderPolicyIds(
                [...snapshotRevertFailed, ...revertFailed].sort()
              )}.`
            : ` Active policies and snapshots that were updated were reverted; the connector is unchanged.`),
        {
          updateFailed: [...snapshotFailed, ...succeeded.map((plan) => plan.policy.id)].sort(),
          revertFailed: [...snapshotRevertFailed, ...revertFailed].sort(),
          bumpFailed,
        }
      );
    }

    // exit 4: happy path — caller may write the connector; keep exact snapshots for undo.
    const rollbackPlans = succeeded;
    const rollbackSnapshots = committedSnapshots;
    return {
      policyCount: rollbackPlans.length + rollbackSnapshots.length,
      revert: async () => {
        logger.warn(
          `Reverting ${rollbackPlans.length} package ${
            rollbackPlans.length === 1 ? 'policy' : 'policies'
          } after a failed connector write for connector ${connectorId}.`
        );
        const snapshotRevertFailed = await revertSnapshotPlans(rollbackSnapshots);
        const { reverted, revertFailed } = await revertPlans(rollbackPlans);
        let bumpFailed = false;
        try {
          await bumpAgentPolicies(reverted);
        } catch (bumpError) {
          bumpFailed = true;
          const bumpMessage = bumpError instanceof Error ? bumpError.message : String(bumpError);
          logger.error(
            `Failed to bump agent policy revisions in space ${spaceId} after rolling back the role ARN fan-out for connector ${connectorId}: ${bumpMessage}`
          );
        }

        revertFailed.push(...snapshotRevertFailed, ...changedByOtherWriter);
        if (revertFailed.length === 0 && !bumpFailed) {
          return;
        }

        revertFailed.sort();
        let message: string;
        if (revertFailed.length > 0) {
          message =
            `Failed to roll back role ARN on ${revertFailed.length} package ${
              revertFailed.length === 1 ? 'policy' : 'policies'
            } for connector ${connectorId} after the connector write failed` +
            ` (ids: ${renderPolicyIds(
              revertFailed
            )}); those policies are now on the new role ARN while the connector still holds the old one.`;
          if (bumpFailed) {
            message +=
              ' Agent policy revision bump after revert also failed; agents may still hold a stale compiled role ARN.';
          }
        } else {
          message =
            `Rolled back role ARN for connector ${connectorId} after the connector write failed, but the agent policy revision bump failed.` +
            ` Agents may still hold a stale compiled role ARN.`;
        }
        throw new CloudConnectorRoleArnPropagationError(message, {
          updateFailed: [],
          revertFailed,
          bumpFailed,
        });
      },
    };
  }

  // ── Phase 2: revert successful forward writes ──────────────────────────────────────────────
  // Best effort: iterates over `succeeded` (plans whose SO holds the new ARN — either a clean
  // Phase 1 success or a post-persist rejection recovered by the re-read above), writing each
  // plan's snapshot back so the connector-still-holds-old-ARN world matches the
  // policies-still-hold-old-ARN world. Same swallow-and-collect pattern as Phase 1;
  // `revertFailed` is what the caller learns about when we throw below.
  logger.warn(
    `Reverting ${succeeded.length} package ${
      succeeded.length === 1 ? 'policy' : 'policies'
    } after ${updateFailed.length} failed role ARN update(s) for connector ${connectorId}.`
  );

  const { reverted, revertFailed } = await revertPlans(succeeded);
  revertFailed.push(...changedByOtherWriter);

  // Bump agent policies for the ones we successfully reverted — their package-policy `revision`
  // moved (once forward, once back), so agents need one bump to re-fetch and discard the stale
  // compiled version they may already have cached. Surface bump failure in `detail.bumpFailed`
  // rather than nesting a second error path; we are already throwing for the policy failures.
  let bumpFailed = false;
  try {
    await bumpAgentPolicies(reverted);
  } catch (bumpError) {
    bumpFailed = true;
    const bumpMessage = bumpError instanceof Error ? bumpError.message : String(bumpError);
    logger.error(
      `Failed to bump agent policy revisions in space ${spaceId} after reverting the role ARN fan-out for connector ${connectorId}: ${bumpMessage}`
    );
  }

  // `pMap` resolves out of order, so sort before reporting: the message and the detail have to be
  // the same for the same failure, whatever order the writes happened to finish in.
  updateFailed.sort();
  revertFailed.sort();

  const message =
    `Failed to update role ARN on ${updateFailed.length} package ${
      updateFailed.length === 1 ? 'policy' : 'policies'
    } for connector ${connectorId}` +
    ` (ids: ${renderPolicyIds(updateFailed)})` +
    (revertFailed.length > 0
      ? `. Revert also failed for ${revertFailed.length} previously updated ${
          revertFailed.length === 1 ? 'policy' : 'policies'
        } (ids: ${renderPolicyIds(
          revertFailed
        )}); those policies are now on the new role ARN while the connector still holds the old one.`
      : `. All previously updated policies were reverted successfully; the connector is unchanged.`) +
    (bumpFailed
      ? ` Agent policy revision bump after revert also failed; agents may still hold a stale compiled role ARN.`
      : '');

  // exit 5: partial failure — caller must NOT write the connector; `detail` carries the ids.
  throw new CloudConnectorRoleArnPropagationError(message, {
    updateFailed,
    revertFailed,
    bumpFailed,
  });
};
