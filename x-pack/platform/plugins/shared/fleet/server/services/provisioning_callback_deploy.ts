/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { PendingAgentlessPolicy } from '../../common/types/models/cloud_onboarding_deployment';
import type { CloudConnectorCallback } from '../../common/types/models/provisioning_callback';

import { appContextService } from './app_context';
import { cloudOnboardingDeploymentService } from './cloud_onboarding_deployment';
import { provisioningCallbackService } from './provisioning_callback';
import { packagePolicyService } from './package_policy';
import { AgentlessPoliciesServiceImpl } from './agentless/agentless_policies';

type PolicyOutcome =
  | { entry: PendingAgentlessPolicy; ok: true }
  | { entry: PendingAgentlessPolicy; ok: false; message: string };

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Deploys the agentless policies stored on the onboarding deployment attached to a received
 * callback record, once. Runs after the receive route has answered the stack; it never throws,
 * and writes whatever went wrong to the record and the deployment instead.
 */
export const deployProvisioningCallback = async (callbackId: string): Promise<void> => {
  const logger = appContextService.getLogger().get('provisioningCallbackDeploy');
  const recordSoClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  const fail = async (message: string) => {
    logger.error(`Provisioning callback deploy failed [id=${callbackId}]: ${message}`);
    await provisioningCallbackService
      .updateDeployStage(recordSoClient, callbackId, {
        deploy_status: 'failed',
        deploy_error: message,
      })
      .catch((error) =>
        logger.error(
          `Provisioning callback deploy [id=${callbackId}] could not record its failure: ${errorMessage(
            error
          )}`
        )
      );
  };

  try {
    const record = await provisioningCallbackService.get(recordSoClient, callbackId);
    if (!isReadyToDeploy(record)) {
      return;
    }
    // The policy services resolve namespaces through the spaces extension, so the client must be
    // scoped explicitly, default space included; the per-space helper drops the extension there.
    const spaceSoClient = appContextService
      .getInternalUserSOClient()
      .asScopedToNamespace(record.space_id ?? DEFAULT_SPACE_ID);
    const deployment = await cloudOnboardingDeploymentService.getById(
      spaceSoClient,
      record.onboarding_deployment_id
    );
    if (deployment.status !== 'pending') {
      return;
    }

    // Both objects say deploying before anything is created, so nothing else starts a second run.
    await Promise.all([
      cloudOnboardingDeploymentService.update(spaceSoClient, deployment.id, {
        status: 'deploying',
      }),
      provisioningCallbackService.updateDeployStage(recordSoClient, callbackId, {
        deploy_status: 'deploying',
      }),
    ]);

    const outcomes = await createPolicies(
      record,
      deployment.pendingAgentlessPolicies ?? [],
      spaceSoClient
    );

    const succeeded = outcomes.filter((outcome) => outcome.ok);
    const failed = outcomes.filter(
      (outcome): outcome is Extract<PolicyOutcome, { ok: false }> => !outcome.ok
    );
    const policyIdsByInstance = Object.fromEntries(
      succeeded.flatMap(({ entry }) =>
        entry.instanceIds.map((instanceId) => [instanceId, entry.id])
      )
    );
    const statusMessage = failed.length
      ? `Deploy failed for ${failed
          .map(({ entry, message }) => `${entry.instanceIds.join(', ')}: ${message}`)
          .join('; ')}`
      : undefined;

    await cloudOnboardingDeploymentService.update(spaceSoClient, deployment.id, {
      status: failed.length ? 'failed' : 'succeeded',
      // The identity the stack created is this deployment's connector, as a Deploy click records.
      connectorId: record.cloud_connector_id,
      ...(statusMessage ? { statusMessage } : {}),
      packagePolicyIds: succeeded.map(({ entry }) => entry.id),
      policyIdsByInstance,
    });
    await provisioningCallbackService.updateDeployStage(recordSoClient, callbackId, {
      deploy_status: failed.length ? 'failed' : 'deployed',
      ...(statusMessage ? { deploy_error: statusMessage } : {}),
    });
    logger.info(
      `Provisioning callback deploy ${
        failed.length ? 'failed' : 'done'
      } [id=${callbackId}] [deployment=${deployment.id}] [created=${succeeded.length}] [failed=${
        failed.length
      }]`
    );
  } catch (error) {
    await fail(errorMessage(error));
  }
};

/** `packagePolicyService.get` throws a saved-object not-found error for a missing policy. */
const findPackagePolicy = async (soClient: SavedObjectsClientContract, id: string) => {
  try {
    return await packagePolicyService.get(soClient, id);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
};

type ReadyRecord = CloudConnectorCallback &
  Required<Pick<CloudConnectorCallback, 'onboarding_deployment_id' | 'cloud_connector_id'>>;

const isReadyToDeploy = (record: CloudConnectorCallback | undefined): record is ReadyRecord =>
  !!record &&
  record.status === 'received' &&
  record.deploy_status === 'pending' &&
  !!record.onboarding_deployment_id &&
  !!record.cloud_connector_id;

/**
 * One policy per stored request, in parallel as the Deploy button does. A policy that already
 * exists under its pre-assigned id counts as created, so a retry does not make a second one.
 */
const createPolicies = async (
  record: ReadyRecord,
  entries: PendingAgentlessPolicy[],
  spaceSoClient: SavedObjectsClientContract
): Promise<PolicyOutcome[]> => {
  const agentlessPolicies = new AgentlessPoliciesServiceImpl(
    packagePolicyService,
    spaceSoClient,
    appContextService.getInternalUserESClient(),
    appContextService.getLogger().get('agentless')
  );
  return Promise.all(
    entries.map(async (entry): Promise<PolicyOutcome> => {
      try {
        const existing = await findPackagePolicy(spaceSoClient, entry.id);
        if (!existing) {
          await agentlessPolicies.createAgentlessPolicy(
            {
              ...entry.request,
              id: entry.id,
              cloud_connector: {
                enabled: true,
                cloud_connector_id: record.cloud_connector_id,
                target_csp: 'aws',
              },
            },
            undefined,
            undefined,
            { createdBy: record.created_by }
          );
        }
        return { entry, ok: true };
      } catch (error) {
        appContextService
          .getLogger()
          .get('provisioningCallbackDeploy')
          .error(
            `Provisioning callback deploy could not create policy [id=${entry.id}]: ${
              error instanceof Error ? error.stack ?? error.message : String(error)
            }`
          );
        return { entry, ok: false, message: errorMessage(error) };
      }
    })
  );
};
