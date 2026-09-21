/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import pMap from 'p-map';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { NewPackagePolicy } from '../../../common/types';
import { MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS, SO_SEARCH_LIMIT } from '../../constants';
import { CloudConnectorRoleArnPropagationError } from '../../errors';
import { appContextService } from '../app_context';
import { packagePolicyService } from '../package_policy';
import { getSpaceForPackagePolicy } from '../spaces/helpers';

import { updateInputsWithRoleArn } from './update_input_vars_with_role_arn';

interface PropagateArgs {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  connectorId: string;
  newRoleArn: string;
}

interface PolicySnapshot {
  id: string;
  inputs: NewPackagePolicy['inputs'];
  namespace: string | undefined;
  policy_ids: string[];
}

/**
 * Fan out a new role ARN to every package policy that references this connector.
 *
 * Semantics: "policies first, then connector; on any policy failure, revert successful policies."
 * The caller writes the connector AFTER a successful call to this function. Idempotent: policies
 * whose inputs contain no `role_arn` (or already hold the new value) are silently skipped.
 */
export const propagateRoleArnToPackagePolicies = async ({
  soClient,
  esClient,
  connectorId,
  newRoleArn,
}: PropagateArgs): Promise<void> => {
  const logger = appContextService.getLogger().get('propagateRoleArnToPackagePolicies');

  const kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id:"${connectorId.replace(
    /"/g,
    '\\"'
  )}"`;

  const { items: policies } = await packagePolicyService.list(soClient, {
    kuery,
    perPage: SO_SEARCH_LIMIT,
    page: 1,
  });

  if (policies.length === 0) {
    logger.debug(`No package policies reference connector ${connectorId}; nothing to fan out.`);
    return;
  }

  const plans = policies
    .map((policy) => {
      const { updated, changed } = updateInputsWithRoleArn(policy.inputs, newRoleArn);
      if (!changed) {
        return null;
      }
      const snapshot: PolicySnapshot = {
        id: policy.id,
        inputs: policy.inputs,
        namespace: policy.namespace,
        policy_ids: policy.policy_ids,
      };
      return { policy, snapshot, updateInputs: updated };
    })
    .filter((plan): plan is NonNullable<typeof plan> => plan !== null);

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

  const soFor = (policy: (typeof policies)[number]) =>
    appContextService.getInternalUserSOClientForSpaceId(getSpaceForPackagePolicy(policy));

  // `packagePolicyService.update` merges the payload into the existing saved object, so only the
  // fields we intend to touch need to be present — except `package`, which it requires to resolve
  // the package info it validates and compiles the inputs against.
  const buildUpdatePayload = (policy: NewPackagePolicy, inputs: NewPackagePolicy['inputs']) => ({
    name: policy.name,
    enabled: policy.enabled,
    policy_ids: policy.policy_ids,
    ...(policy.package ? { package: policy.package } : {}),
    inputs,
  });

  const updateFailed: string[] = [];
  const succeeded: typeof plans = [];

  await pMap(
    plans,
    async (plan) => {
      try {
        await packagePolicyService.update(
          soFor(plan.policy),
          esClient,
          plan.policy.id,
          buildUpdatePayload(plan.policy, plan.updateInputs)
        );
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
  await pMap(
    succeeded,
    async (plan) => {
      try {
        await packagePolicyService.update(
          soFor(plan.policy),
          esClient,
          plan.policy.id,
          buildUpdatePayload(plan.policy, plan.snapshot.inputs)
        );
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

  const message =
    `Failed to update role ARN on ${updateFailed.length} package ${
      updateFailed.length === 1 ? 'policy' : 'policies'
    } for connector ${connectorId}` +
    ` (ids: ${updateFailed.join(', ')})` +
    (revertFailed.length > 0
      ? `. Revert also failed for ${revertFailed.length} previously updated ${
          revertFailed.length === 1 ? 'policy' : 'policies'
        } (ids: ${revertFailed.join(
          ', '
        )}); those policies are now on the new role ARN while the connector still holds the old one.`
      : `. All previously updated policies were reverted successfully; the connector is unchanged.`);

  throw new CloudConnectorRoleArnPropagationError(message, { updateFailed, revertFailed });
};
