/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import pMap from 'p-map';

import { ALL_SPACES_ID, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { NewPackagePolicy, PackagePolicy } from '../../../common/types';
import { MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS } from '../../constants';
import { CloudConnectorRoleArnPropagationError } from '../../errors';
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';
import { packagePolicyService, toPackagePolicyUpdate } from '../package_policy';
import { escapeSearchQueryPhrase } from '../saved_object';
import { getSpaceForPackagePolicy } from '../spaces/helpers';

import { rewritePolicyRoleArn } from './update_input_vars_with_role_arn';

interface PropagateArgs {
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
 * Fan out a new role ARN to every package policy that references this connector.
 *
 * Semantics: "policies first, then connector; on any policy failure, revert successful policies."
 * The caller writes the connector AFTER a successful call to this function. Idempotent: policies
 * that carry no `role_arn` variable (or already hold the new value) at any of top-level
 * `packagePolicy.vars`, input-level `vars`, or per-stream `vars` are silently skipped.
 *
 * Exit points (in source order):
 *   1. `return` — no package policy references the connector (nothing to do).
 *   2. `return` — policies reference the connector but none carry a `role_arn` variable.
 *   3. `return` — Phase 1 forward writes all succeeded; agent-policy revisions bumped once per
 *      space. Caller is safe to write the connector.
 *   4. `throw`  — Phase 1 had one or more failures; Phase 2 best-effort reverts the successful
 *      ones and throws `CloudConnectorRoleArnPropagationError` carrying `updateFailed` and
 *      `revertFailed` id lists. Caller must NOT write the connector.
 */
export const propagateRoleArnToPackagePolicies = async ({
  esClient,
  connectorId,
  newRoleArn,
}: PropagateArgs): Promise<void> => {
  const logger = appContextService.getLogger().get('propagateRoleArnToPackagePolicies');

  // Deliberately unfiltered, unlike the browser's `useCloudConnectorUsage`, which hides
  // CLOUD_CONNECTOR_HIDDEN_PACKAGES (the permission verifier) from the count shown before saving:
  // the verifier policy has to move to the new role too, or it would keep checking the old one.
  // The user-facing count therefore under-reports what this rewrites.
  const kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id:${escapeSearchQueryPhrase(
    connectorId
  )}`;

  // A connector saved object is shared across spaces, so the policies referencing it can live in
  // any of them. The route's request-scoped client only sees the caller's space, which would
  // silently skip the rest; each policy is then written back through its own space client.
  //
  // `fetchAllItems` pages under a Point-In-Time snapshot, so we neither cap at SO_SEARCH_LIMIT
  // (a heavy-usage connector would silently keep the tail on the old ARN) nor race with a
  // concurrent policy edit (the connector write below would then disagree with what got
  // rewritten here).
  const policies: PackagePolicy[] = [];
  for await (const page of await packagePolicyService.fetchAllItems(
    appContextService.getInternalUserSOClientWithoutSpaceExtension(),
    { kuery, spaceIds: [ALL_SPACES_ID] }
  )) {
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

  const soFor = (policy: PackagePolicy) =>
    appContextService.getInternalUserSOClientForSpaceId(getSpaceForPackagePolicy(policy));

  const writePolicyRoleArn = (
    plan: PolicyPlan,
    vars: NewPackagePolicy['vars'],
    inputs: NewPackagePolicy['inputs'],
    version?: string
  ) =>
    packagePolicyService.update(
      soFor(plan.policy),
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
      // concurrently; the whole fan-out is bumped once per space below instead.
      { bumpRevision: false }
    );

  /**
   * Best effort: the policies already hold the new ARN, so a failed bump only delays agents
   * picking it up until the next revision change. Failing the fan-out here would be worse — it
   * would leave the connector on the old ARN while the policies are on the new one.
   */
  const bumpAgentPolicies = async (bumped: PolicyPlan[]) => {
    const agentPolicyIdsBySpace = new Map<string, Set<string>>();
    for (const { policy } of bumped) {
      const spaceId = getSpaceForPackagePolicy(policy);
      const ids = agentPolicyIdsBySpace.get(spaceId) ?? new Set<string>();
      for (const agentPolicyId of policy.policy_ids ?? []) {
        ids.add(agentPolicyId);
      }
      agentPolicyIdsBySpace.set(spaceId, ids);
    }

    for (const [spaceId, ids] of agentPolicyIdsBySpace) {
      if (ids.size === 0) {
        continue;
      }
      try {
        await agentPolicyService.bumpAgentPoliciesByIds([...ids].sort(), {}, spaceId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(
          `Failed to bump agent policy revisions in space ${spaceId} after the role ARN fan-out for connector ${connectorId}: ${message}`
        );
      }
    }
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
          const current = await packagePolicyService.get(soFor(plan.policy), plan.policy.id);
          if (current) {
            // `changed: false` means every role_arn already holds newRoleArn — the SO write
            // landed and a later step rejected. Include it in the revert set.
            const { changed } = rewritePolicyRoleArn(current, newRoleArn);
            if (!changed) {
              succeeded.push({ ...plan, writeVersion: current.version });
            }
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
    await bumpAgentPolicies(succeeded);
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

  const revertFailed: string[] = [];
  const reverted: PolicyPlan[] = [];
  await pMap(
    succeeded,
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

  // Bump agent policies for the ones we successfully reverted — their package-policy `revision`
  // moved (once forward, once back), so agents need one bump to re-fetch and discard the stale
  // compiled version they may already have cached.
  await bumpAgentPolicies(reverted);

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
