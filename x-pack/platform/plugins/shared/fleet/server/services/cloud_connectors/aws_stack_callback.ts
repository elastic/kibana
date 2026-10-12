/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { AccountType, CloudConnector } from '../../../common/types/models/cloud_connector';
import type { AwsStackCallback } from '../../../common/types/models/cloud_onboarding_deployment';
import type { CloudOnboardingDeploymentSOAttributes } from '../../types/so_attributes';
import {
  CloudConnectorCreateError,
  FleetErrorWithStatusCode,
  IacProvisionerRequestError,
} from '../../errors';
import { getErrorMessage } from '../../errors/utils';
import { cloudConnectorService } from '../cloud_connector';
import { iacProvisionerService, type IacProvisionerCallbackReport } from '../iac_provisioner';

type OnboardingSavedObject = SavedObject<CloudOnboardingDeploymentSOAttributes>;

const MAX_ERROR_LENGTH = 1024;

export interface StartAwsStackCallbackOptions {
  connectorName?: string;
  accountType?: AccountType;
  iac_key?: string | null;
  iac_blueprint_id?: string | null;
  iac_blueprint_version?: string | null;
}

export interface AwsStackCallbackStart {
  stackParams: { ElasticOnboardingId: string; ElasticCallback: string };
  expiresAt: string;
}

export const isAwsStackCallbackPending = (callback: AwsStackCallback | undefined): boolean =>
  callback?.status === 'waiting' || callback?.status === 'completing';

/**
 * Asks the IaC Provisioner for an upload form and records it as the deployment's pending
 * callback. Starting again replaces an earlier callback that has not been claimed: only the
 * stack launched last can then create the identity.
 */
export async function startAwsStackCallback(
  soClient: SavedObjectsClientContract,
  deploymentId: string,
  options: StartAwsStackCallbackOptions
): Promise<AwsStackCallbackStart> {
  const so = await getOnboarding(soClient, deploymentId);
  if (so.attributes.awsStackCallback?.status === 'completing') {
    throw new FleetErrorWithStatusCode('An identity is already being created for this stack', 409);
  }

  const ticket = await iacProvisionerService.createCallback();
  await write(soClient, so, {
    onboardingId: ticket.onboardingId,
    status: 'waiting',
    startedAt: new Date().toISOString(),
    expiresAt: ticket.expiresAt,
    connectorName: options.connectorName?.trim() || undefined,
    accountType: options.accountType,
    iac_key: options.iac_key,
    iac_blueprint_id: options.iac_blueprint_id,
    iac_blueprint_version: options.iac_blueprint_version,
  });

  return {
    stackParams: { ElasticOnboardingId: ticket.onboardingId, ElasticCallback: ticket.callback },
    expiresAt: ticket.expiresAt,
  };
}

/**
 * Advances a waiting callback: creates the identity once the stack has reported, marks it
 * expired once the upload form can no longer be used, and otherwise leaves it waiting. Safe
 * to call from several places at once; only one caller creates the identity.
 */
export async function checkAwsStackCallback(
  soClient: SavedObjectsClientContract,
  deploymentId: string,
  logger: Logger
): Promise<AwsStackCallback | undefined> {
  const so = await getOnboarding(soClient, deploymentId);
  const callback = so.attributes.awsStackCallback;
  if (callback?.status !== 'waiting') {
    return callback;
  }
  // Whatever wrote since `so` was read (e.g. a new launch) wins over this check.
  const settle = async (next: AwsStackCallback) =>
    (await tryWrite(soClient, so, next))
      ? next
      : (await getOnboarding(soClient, deploymentId)).attributes.awsStackCallback;

  let report: IacProvisionerCallbackReport | undefined;
  try {
    report = await iacProvisionerService.getCallback(callback.onboardingId);
  } catch (error) {
    // Outages and throttling are retried on the next check; a rejected report never becomes valid.
    if (!(error instanceof IacProvisionerRequestError && error.statusCode === 422)) {
      throw error;
    }
    return settle({ ...callback, status: 'failed', error: truncate(getErrorMessage(error)) });
  }

  if (!report) {
    if (Date.now() < Date.parse(callback.expiresAt)) {
      return callback;
    }
    return settle({ ...callback, status: 'expired' });
  }

  // The user picked or created an identity by hand and deployed with it; don't replace it.
  if (so.attributes.connectorId) {
    return settle({
      ...callback,
      status: 'failed',
      stackId: report.stackId,
      error: 'This onboarding already uses another identity',
    });
  }

  const claimed: AwsStackCallback = { ...callback, status: 'completing', stackId: report.stackId };
  if (!(await tryWrite(soClient, so, claimed))) {
    return (await getOnboarding(soClient, deploymentId)).attributes.awsStackCallback;
  }

  try {
    const connector = await createConnector(soClient, claimed, report);
    logger.info(
      `Created cloud connector ${connector.id} from the report of stack callback ${callback.onboardingId}`
    );
    return await writeLatest(
      soClient,
      deploymentId,
      {
        ...claimed,
        status: 'completed',
        connectorId: connector.id,
        connectorName: connector.name,
      },
      { connectorId: connector.id, authMethod: 'identity_federation' }
    );
  } catch (error) {
    logger.warn(
      `Could not create a cloud connector from stack callback ${
        callback.onboardingId
      }: ${getErrorMessage(error)}`
    );
    return writeLatest(soClient, deploymentId, {
      ...claimed,
      status: 'failed',
      error: truncate(getErrorMessage(error)),
    });
  }
}

async function createConnector(
  soClient: SavedObjectsClientContract,
  callback: AwsStackCallback,
  report: IacProvisionerCallbackReport
): Promise<CloudConnector> {
  const create = (name: string) =>
    cloudConnectorService.create(soClient, {
      name,
      cloudProvider: 'aws',
      accountType: callback.accountType,
      vars: { role_arn: { value: report.roleArn, type: 'text' } },
      iac_key: callback.iac_key,
      iac_blueprint_id: callback.iac_blueprint_id,
      iac_blueprint_version: callback.iac_blueprint_version,
      iac_deployment_id: report.stackId,
    });

  const suffix = stackSuffix(report.stackId);
  const name = callback.connectorName || `AWS ${report.accountId} ${suffix}`;
  try {
    return await create(name);
  } catch (error) {
    // Nobody is there to pick another name, so disambiguate rather than fail.
    if (
      callback.connectorName &&
      error instanceof CloudConnectorCreateError &&
      error.message.includes('already exists')
    ) {
      return create(`${name} (${suffix})`);
    }
    throw error;
  }
}

/** First block of the stack's UUID: short, and unique enough to tell stacks apart in a list. */
const stackSuffix = (stackId: string): string =>
  stackId.split('/').pop()?.split('-')[0] ?? stackId.slice(-8);

const truncate = (message: string): string =>
  message.length > MAX_ERROR_LENGTH ? `${message.slice(0, MAX_ERROR_LENGTH - 1)}…` : message;

const getOnboarding = (
  soClient: SavedObjectsClientContract,
  id: string
): Promise<OnboardingSavedObject> =>
  soClient.get<CloudOnboardingDeploymentSOAttributes>(
    CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
    id
  );

/**
 * Full replace, failing if the deployment changed since it was read. A partial update would
 * deep-merge and keep fields of an earlier callback (e.g. its error) in the new one.
 */
const write = (
  soClient: SavedObjectsClientContract,
  so: OnboardingSavedObject,
  awsStackCallback: AwsStackCallback,
  attributes: Partial<CloudOnboardingDeploymentSOAttributes> = {}
) =>
  soClient.create<CloudOnboardingDeploymentSOAttributes>(
    CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
    { ...so.attributes, ...attributes, awsStackCallback },
    { id: so.id, overwrite: true, version: so.version, references: so.references }
  );

const tryWrite = async (
  soClient: SavedObjectsClientContract,
  so: OnboardingSavedObject,
  awsStackCallback: AwsStackCallback
): Promise<boolean> => {
  try {
    await write(soClient, so, awsStackCallback);
    return true;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isConflictError(error)) {
      return false;
    }
    throw error;
  }
};

/** Writes on top of the latest deployment; for the caller that claimed the callback. */
const writeLatest = async (
  soClient: SavedObjectsClientContract,
  id: string,
  awsStackCallback: AwsStackCallback,
  attributes: Partial<CloudOnboardingDeploymentSOAttributes> = {}
): Promise<AwsStackCallback> => {
  const latest = await getOnboarding(soClient, id);
  await write(soClient, { ...latest, version: undefined }, awsStackCallback, attributes);
  return awsStackCallback;
};
