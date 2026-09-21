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
import { MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS, SO_SEARCH_LIMIT } from '../../constants';
import { CloudConnectorRoleArnPropagationError } from '../../errors';
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';
import { packagePolicyService, toPackagePolicyUpdate } from '../package_policy';
import { escapeSearchQueryPhrase } from '../saved_object';
import { getSpaceForPackagePolicy } from '../spaces/helpers';

import { updateInputsWithRoleArn } from './update_input_vars_with_role_arn';

interface PropagateArgs {
  esClient: ElasticsearchClient;
  connectorId: string;
  newRoleArn: string;
}

interface PolicyPlan {
  policy: PackagePolicy;
  previousInputs: NewPackagePolicy['inputs'];
  updatedInputs: NewPackagePolicy['inputs'];
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
 * whose inputs contain no `role_arn` (or already hold the new value) are silently skipped.
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
  const { items: policies } = await packagePolicyService.list(
    appContextService.getInternalUserSOClientWithoutSpaceExtension(),
    {
      kuery,
      perPage: SO_SEARCH_LIMIT,
      page: 1,
      spaceId: ALL_SPACES_ID,
    }
  );

  if (policies.length === 0) {
    logger.debug(`No package policies reference connector ${connectorId}; nothing to fan out.`);
    return;
  }

  const plans = policies
    .map((policy): PolicyPlan | null => {
      const { updated, changed } = updateInputsWithRoleArn(policy.inputs, newRoleArn);
      return changed ? { policy, previousInputs: policy.inputs, updatedInputs: updated } : null;
    })
    .filter((plan): plan is PolicyPlan => plan !== null);

  if (plans.length === 0) {
    logger.debug(
      `Connector ${connectorId} has ${policies.length} referencing package policies but none carry a role_arn variable; nothing to fan out.`
    );
    return;
  }

  logger.info(
    `Fanning out new role ARN to ${plans.length} package ${
      plans.length === 1 ? 'policy' : 'policies'
    } referencing connector ${connectorId}.`
  );

  const soFor = (policy: PackagePolicy) =>
    appContextService.getInternalUserSOClientForSpaceId(getSpaceForPackagePolicy(policy));

  const writeInputs = (plan: PolicyPlan, inputs: NewPackagePolicy['inputs']) =>
    packagePolicyService.update(
      soFor(plan.policy),
      esClient,
      plan.policy.id,
      { ...toPackagePolicyUpdate(plan.policy), inputs },
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

  const updateFailed: string[] = [];
  const succeeded: PolicyPlan[] = [];

  await pMap(
    plans,
    async (plan) => {
      try {
        await writeInputs(plan, plan.updatedInputs);
        succeeded.push(plan);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(
          `Failed to update package policy ${plan.policy.id} with new role ARN: ${message}`
        );
        updateFailed.push(plan.policy.id);
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
    return;
  }

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
        await writeInputs(plan, plan.previousInputs);
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

  throw new CloudConnectorRoleArnPropagationError(message, { updateFailed, revertFailed });
};
