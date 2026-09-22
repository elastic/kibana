/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import pMap from 'p-map';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { NewPackagePolicy, PackagePolicy } from '../../../common/types';
import { MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS } from '../../constants';
import { CloudConnectorRoleArnPropagationError } from '../../errors';
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';
import { packagePolicyService, toPackagePolicyUpdate } from '../package_policy';
import { escapeSearchQueryPhrase } from '../saved_object';

import { policyHoldsRoleArn, rewritePolicyRoleArn } from './update_input_vars_with_role_arn';

interface PropagateArgs {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  connectorId: string;
  newRoleArn: string;
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

/** Ids rendered inline in the thrown message; `detail.updateFailed` always carries the full list. */
const MAX_RENDERED_POLICY_IDS = 20;

const renderPolicyIds = (ids: string[]): string => {
  const shown = ids.slice(0, MAX_RENDERED_POLICY_IDS);
  const remaining = ids.length - shown.length;
  return remaining > 0 ? `${shown.join(', ')}, +${remaining} more` : shown.join(', ');
};

/**
 * Fan out a new role ARN to every package policy that references this connector **in the
 * caller's Kibana space**.
 *
 * Connectors are created with the request-scoped SO client and live in that space; the flyout
 * usage list and package-policy count are space-scoped the same way. Cross-space fan-out via
 * internal clients would let a caller with Fleet privilege in one space mutate policies in
 * spaces they cannot manage — so this stays on `soClient` and does not query `spaceIds: ['*']`.
 *
 * Semantics: "policies first, then connector; on any policy failure, revert successful policies."
 * The caller writes the connector AFTER a successful call to this function. Idempotent: policies
 * that carry no `role_arn` variable (or already hold the new value) at any of top-level
 * `packagePolicy.vars`, input-level `vars`, or per-stream `vars` are silently skipped.
 *
 * Exit points (in source order):
 *   1. `return` — no package policy references the connector (nothing to do).
 *   2. `return` — policies reference the connector but none carry a `role_arn` variable.
 *   3. `return` — Phase 1 forward writes all succeeded and the agent-policy revision bump
 *      succeeded. Caller is safe to write the connector.
 *   4. `throw`  — Phase 1 had policy failures, or the post-Phase-1 agent-policy bump failed;
 *      successful policy writes are reverted and `CloudConnectorRoleArnPropagationError` is
 *      thrown with `updateFailed` / `revertFailed` id lists. Caller must NOT write the connector.
 */
export const propagateRoleArnToPackagePolicies = async ({
  soClient,
  esClient,
  connectorId,
  newRoleArn,
}: PropagateArgs): Promise<void> => {
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

  if (policies.length === 0) {
    logger.debug(`No package policies reference connector ${connectorId}; nothing to fan out.`);
    return; // exit 1/4: nothing references this connector
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

  if (plans.length === 0) {
    logger.debug(
      `Connector ${connectorId} has ${policies.length} referencing package policies but none carry a role_arn variable; nothing to fan out.`
    );
    return; // exit 2/4: policies reference this connector but hold no role_arn to rewrite
  }

  logger.info(
    `Fanning out new role ARN to ${plans.length} package ${
      plans.length === 1 ? 'policy' : 'policies'
    } referencing connector ${connectorId}.`
  );

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
        vars,
        inputs,
        // `packagePolicyService.update` passes this through to `soClient.update` as the OCC
        // token. Without it a concurrent edit between the PIT read and this write is silently
        // overwritten by the stale vars/inputs payload.
        ...(version !== undefined ? { version } : {}),
      },
      // Policies sharing an agent policy would each read-modify-write the same `revision`
      // concurrently; the whole fan-out is bumped once below instead.
      { bumpRevision: false }
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
    await agentPolicyService.bumpAgentPoliciesByIds([...agentPolicyIds].sort(), {}, spaceId);
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
  // while classifying it as `updateFailed` (and therefore out of Phase 2). On catch we re-read
  // and, if the stored ARN is already the new value, add the plan to `succeeded` so Phase 2
  // reverts it too.
  const updateFailed: string[] = [];
  const succeeded: PolicyPlan[] = [];

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
        updateFailed.push(plan.policy.id);

        try {
          const current = await packagePolicyService.get(soClient, plan.policy.id);
          if (current && policyHoldsRoleArn(current, newRoleArn)) {
            // SO write landed (every role_arn field is already the new value) and a later step
            // rejected. Include it in the revert set. Do not use bare `!changed` — that is also
            // true when a concurrent edit removed all Role ARN fields.
            succeeded.push({ ...plan, writeVersion: current.version });
          }
        } catch (reReadError) {
          const reReadMessage =
            reReadError instanceof Error ? reReadError.message : String(reReadError);
          logger.error(
            `Could not re-read package policy ${plan.policy.id} after a failed role ARN update to decide whether to revert: ${reReadMessage}`
          );
        }
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
      try {
        await bumpAgentPolicies(reverted);
      } catch (revertBumpError) {
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
            : `. All previously updated policies were reverted successfully; the connector is unchanged.`),
        { updateFailed: failedIds, revertFailed }
      );
    }

    logger.info(
      `Successfully fanned out new role ARN to ${succeeded.length} package ${
        succeeded.length === 1 ? 'policy' : 'policies'
      }.`
    );
    return; // exit 3/4: happy path — caller may now write the connector
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

  // Bump agent policies for the ones we successfully reverted — their package-policy `revision`
  // moved (once forward, once back), so agents need one bump to re-fetch and discard the stale
  // compiled version they may already have cached. Already throwing below, so a bump failure
  // here is logged rather than nested into a second error path.
  try {
    await bumpAgentPolicies(reverted);
  } catch (bumpError) {
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
      : `. All previously updated policies were reverted successfully; the connector is unchanged.`);

  // exit 4/4: partial failure — caller must NOT write the connector; `detail` carries the ids.
  throw new CloudConnectorRoleArnPropagationError(message, { updateFailed, revertFailed });
};
