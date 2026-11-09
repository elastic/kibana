/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { parseAwsRegionFromArn } from '../../../common/services/cloud_connectors';
import {
  IAC_KEY_CHECK_FLOW,
  type IacKeyCheckReason,
  type IacKeySurface,
  type IacKeyVerificationOutcome,
  type IacProvisionerRenderFlow,
} from '../../../common/telemetry/iac_provisioner_events';
import { AWS_CLOUD_PROVIDER } from '../../../common/types/models/cloud_connector';
import type { IacUpgradeStatus } from '../../../common/types/models/cloud_connector';
import {
  IAC_FEDERATED_IDENTITY_WORKFLOW,
  MAX_IAC_RENDER_INTEGRATIONS,
} from '../../../common/types/rest_spec/iac_provisioner';
import type { CloudConnectorSOAttributes } from '../../types/so_attributes';
import {
  IacProvisionerRequestError,
  IacProvisionerUnavailableError,
  PackageNotFoundError,
} from '../../errors';
import { getErrorMessage } from '../../errors/utils';
import { appContextService } from '../app_context';
import { iacProvisionerService } from '../iac_provisioner';
import { buildIacProvisionerIntegrations, isBuildError } from '../iac_provisioner_integrations';
import {
  reportIacProvisionerKeyVerificationCompleted,
  reportIacProvisionerRenderCompleted,
  reportIacProvisionerRenderRequested,
} from '../telemetry/iac_provisioner_telemetry';
import { isIacProvisionerSupportedFor } from '../utils/iac_provisioner';

import {
  getCloudConnectorIntegrationSelections,
  mergeIntegrationSelections,
  type IacIntegrationSelection,
} from './iac_integrations';

export interface IacKeyVerification {
  /** False only when the deployed template must be updated; true also when the check could not run. */
  matches: boolean;
  reason?: IacKeyCheckReason;
  /** The full verdict — lets callers tell a definite match from a fail-open. */
  outcome: IacKeyVerificationOutcome;
  /** From `iac_deployment_id`; absent for legacy connectors. */
  deploymentId?: string;
  /** Parsed from the deployment id (AWS ARN); absent when the id is absent or malformed. */
  region?: string;
  /** The connector's live integration set merged with the requested one — the browser renders exactly this. */
  integrations: IacIntegrationSelection[];
}

export interface IacKeyOutcomeOptions {
  /** Telemetry flow for the render_requested/completed events. */
  flow: IacProvisionerRenderFlow;
  /** Short label for log lines, e.g. `connector cc-1`. */
  contextForLog: string;
}

/**
 * Works out whether a connector's deployed CloudFormation template still covers its integrations.
 * Shared by the verify route (flyout and onboarding checks) and the daily upgrade task.
 *
 * Kibana never inspects the stack itself. It asks IaCP to render the template for the connector's
 * current integration set and passes the stored `iac_key` along; IaCP replies with `render: true`
 * when the template it would generate now differs from the one that key identifies.
 *
 * Outcomes, checked in this order:
 * - `unsupported_provider`: not an AWS connector, or IaCP is not enabled.
 * - `no_integrations`: the connector has no integrations attached.
 * - `key_unavailable`: no verdict. The saved integrations reference a package, policy template or
 *   input that no longer exists, or IaCP could not be reached. Callers fail open: the daily task
 *   keeps the stored status, and the flyout and onboarding do not block.
 * - `no_key`: the connector has no `iac_key`, so the static template is deployed and an upgrade to
 *   the generated one is available. IaCP is not asked. This is only reported after the saved
 *   integrations have resolved, because the Update button the callout then shows renders that same
 *   set through the strict render route, which would reject a stale one.
 * - `key_mismatch`: IaCP says the template has changed since the stored key.
 * - `matches`: the deployed template is current.
 *
 * Registry and IaCP failures never throw; they become `key_unavailable`. Saved-object errors from
 * the caller's own reads happen before this runs and propagate.
 */
export const getIacKeyOutcome = async (
  soClient: SavedObjectsClientContract,
  {
    cloudProvider,
    iac_key: storedKey,
  }: Pick<CloudConnectorSOAttributes, 'cloudProvider' | 'iac_key'>,
  selections: IacIntegrationSelection[],
  { flow, contextForLog }: IacKeyOutcomeOptions
): Promise<IacKeyVerificationOutcome> => {
  // The literal comparison narrows the provider for the render call; the gate adds the
  // "IaCP enabled" half.
  if (
    cloudProvider !== AWS_CLOUD_PROVIDER ||
    !(await isIacProvisionerSupportedFor(cloudProvider))
  ) {
    return 'unsupported_provider';
  }
  if (selections.length === 0) {
    return 'no_integrations';
  }
  const logger = appContextService.getLogger().get('IacKeyVerification');
  if (selections.length > MAX_IAC_RENDER_INTEGRATIONS) {
    // The render route the flyout's Update goes through rejects a set this large, so a verdict
    // could not be acted on; leave the stored status alone.
    logger.warn(
      `IaC template check skipped for ${contextForLog} (fail open): ${selections.length} packages exceed the render limit of ${MAX_IAC_RENDER_INTEGRATIONS}`
    );
    return 'key_unavailable';
  }
  const startTime = Date.now();
  const failOpen = (error: unknown): IacKeyVerificationOutcome => {
    // Mirror the render route's telemetry mapping: provider status when we have one, 500 for
    // anything else; 0 is reserved for "no response".
    const httpStatus =
      error instanceof IacProvisionerRequestError || error instanceof IacProvisionerUnavailableError
        ? error.statusCode ?? 0
        : 500;
    const errorCodes = error instanceof IacProvisionerRequestError ? error.errorCodes : [];
    reportIacProvisionerRenderCompleted({
      flow,
      success: false,
      httpStatus,
      errorCodes,
      latencyMs: Date.now() - startTime,
    });
    logger.warn(
      `IaC template check skipped for ${contextForLog} (fail open): ${getErrorMessage(error)}`
    );
    return 'key_unavailable';
  };

  // The browser's render route rejects any set with a package, template or input the manifests
  // do not declare, so an "upgrade available" verdict computed over the surviving entries would
  // send the user into a render that 400s. A stale connector therefore cannot be compared at
  // all: fail open without a render. This runs before the `no_key` answer for the same reason.
  let built: Awaited<ReturnType<typeof buildIacProvisionerIntegrations>>;
  try {
    built = await buildIacProvisionerIntegrations({
      savedObjectsClient: soClient,
      requestedIntegrations: selections,
    });
  } catch (error) {
    if (error instanceof PackageNotFoundError) {
      logger.debug(
        `No comparable ${cloudProvider} integration set for ${contextForLog}: a package of the connector is not installed or in the registry; nothing to compare`
      );
      return 'key_unavailable';
    }
    return failOpen(error);
  }
  if (isBuildError(built)) {
    logger.warn(
      `IaC template check skipped for ${contextForLog} (fail open): the connector's policies enable entries its packages no longer declare: ${built.errorMessage}`
    );
    return 'key_unavailable';
  }
  // Non-empty selections either all resolve or fail above, so `integrations` is never empty here.
  const { integrations } = built;

  if (!storedKey?.trim()) {
    logger.debug(`No stored IaC key for ${contextForLog}; static template deployed`);
    return 'no_key';
  }
  const storedSha = storedKey.trim();
  logger.debug(
    `Comparing stored key ${storedSha} for ${contextForLog} against ${
      selections.length
    } packages (${selections.map(({ name }) => name).join(', ')})`
  );
  try {
    reportIacProvisionerRenderRequested({ flow, integrationCount: integrations.length });
    // The client rejects a body without render/templateSha (IacProvisionerUnavailableError),
    // so a resolved response always carries the verdict.
    const { render, templateSha } = await iacProvisionerService.renderTemplate({
      provider: cloudProvider,
      workflow: IAC_FEDERATED_IDENTITY_WORKFLOW,
      integrations,
      templateSha: storedSha,
    });
    reportIacProvisionerRenderCompleted({
      flow,
      success: true,
      httpStatus: 200,
      errorCodes: [],
      latencyMs: Date.now() - startTime,
    });
    logger.debug(
      `Provider compared ${contextForLog}: stored ${storedSha}, current ${templateSha}, render=${render}`
    );
    return render ? 'key_mismatch' : 'matches';
  } catch (error) {
    return failOpen(error);
  }
};

/**
 * The stored `iac_upgrade_status` for a verification outcome, or undefined when the outcome says
 * nothing about the connector (provider unreachable, unsupported, nothing attached) and the last
 * known status must stay as it is.
 */
export const toUpgradeStatus = (
  outcome: IacKeyVerificationOutcome
): IacUpgradeStatus | undefined => {
  switch (outcome) {
    case 'matches':
      return 'up_to_date';
    case 'no_key':
    case 'key_mismatch':
      return 'upgrade_available';
    default:
      return undefined;
  }
};

/**
 * A re-check of the connector as it stands asks exactly what the daily upgrade task asks, so a
 * definite answer replaces the stored status instead of waiting up to a day for the task. Only
 * the status is written: `iac_upgrade_checked_at` is the daily task's stamp (the only thing that
 * discovers upgrades), and a re-check must not make it look as if the task had just run.
 * A failed write is logged and swallowed:
 * the caller still gets its answer and the task will retry.
 */
const persistUpgradeStatus = async (
  soClient: SavedObjectsClientContract,
  cloudConnectorId: string,
  /**
   * Read before the render and used only for the log line, so an upgrade-task write landing in
   * between makes the logged "from" value stale — never the stored one, which is this outcome.
   */
  previousStatus: IacUpgradeStatus | undefined,
  outcome: IacKeyVerificationOutcome,
  surface: IacKeySurface,
  logger: Logger
): Promise<void> => {
  const status = toUpgradeStatus(outcome);
  if (status === undefined) {
    return;
  }
  try {
    await soClient.update<CloudConnectorSOAttributes>(
      CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      cloudConnectorId,
      { iac_upgrade_status: status }
    );
  } catch (error) {
    logger.error(
      `Failed to store IaC upgrade status for connector ${cloudConnectorId}: ${getErrorMessage(
        error
      )}`
    );
    return;
  }
  const message = `IaC upgrade status for connector ${cloudConnectorId}: ${
    previousStatus ?? '<unset>'
  } → ${status} (${surface} verify)`;
  if (previousStatus === status) {
    logger.debug(message);
    return;
  }
  logger.info(message);
};

export interface VerifyCloudConnectorIacKeyOptions {
  /**
   * False resolves the connector's integration set (merged with `newIntegrations`) and returns
   * `not_checked` without asking IaCP, persisting anything or reporting telemetry: a read, for
   * a surface that only needs the set to render from (the flyout on open).
   */
  compare?: boolean;
}

export const verifyCloudConnectorIacKey = async (
  soClient: SavedObjectsClientContract,
  cloudConnectorId: string,
  newIntegrations?: IacIntegrationSelection[],
  { compare = true }: VerifyCloudConnectorIacKeyOptions = {}
): Promise<IacKeyVerification> => {
  const logger = appContextService.getLogger().get('IacKeyVerification');
  const startTime = Date.now();
  // An empty array is the flyout asking about the connector as it stands, same as omitting it.
  const isAddingIntegrations = Boolean(newIntegrations?.length);
  // Only the AWS onboarding adds integrations, so the telemetry surface follows the set.
  const surface: IacKeySurface = isAddingIntegrations ? 'onboarding' : 'flyout';

  // SO reads propagate (the route maps them to 404/500); only the render call fails open —
  // answering "up to date" during an SO outage would be the worse lie.
  const { attributes } = await soClient.get<CloudConnectorSOAttributes>(
    CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
    cloudConnectorId
  );
  const { integrations: existing, exceedsCap } = await getCloudConnectorIntegrationSelections(
    soClient,
    cloudConnectorId,
    { maxPackages: MAX_IAC_RENDER_INTEGRATIONS }
  );
  const merged = mergeIntegrationSelections([...existing, ...(newIntegrations ?? [])]);
  const deploymentId = attributes.iac_deployment_id || undefined;
  const region = parseAwsRegionFromArn(deploymentId);
  const { cloudProvider } = attributes;
  // The request body caps only the integrations being added; the merged set can be larger. The
  // browser re-renders the returned set as-is through the render route, which rejects more than
  // MAX_IAC_RENDER_INTEGRATIONS packages, so a set that large is returned empty and left
  // uncompared: no stack action is offered that could not complete. The stored set alone can
  // already be over the cap (the lookup stops reading then), or the additions can push it over.
  const exceedsRenderCap = exceedsCap || merged.length > MAX_IAC_RENDER_INTEGRATIONS;
  if (exceedsRenderCap) {
    logger.warn(
      `IaC key check skipped for connector ${cloudConnectorId}: the integration set exceeds the render limit of ${MAX_IAC_RENDER_INTEGRATIONS} packages`
    );
  }
  const integrations = exceedsRenderCap ? [] : merged;

  if (!compare) {
    logger.debug(
      `IaC integration set read for connector ${cloudConnectorId} (${cloudProvider}), no comparison`
    );
    return { matches: true, outcome: 'not_checked', deploymentId, region, integrations };
  }

  const finish = (outcome: IacKeyVerificationOutcome): IacKeyVerification => {
    logger.info(
      `IaC key check for connector ${cloudConnectorId} (${surface}, ${cloudProvider}): ${outcome}` +
        (isAddingIntegrations
          ? ` — adding ${(newIntegrations ?? [])
              .map(
                ({ name, policyTemplates }) =>
                  `${name}[${policyTemplates.map((template) => template.name).join(',')}]`
              )
              .join(', ')}`
          : '')
    );
    reportIacProvisionerKeyVerificationCompleted({
      surface,
      outcome,
      hasDeploymentId: Boolean(deploymentId),
      integrationCount: integrations.length,
      latencyMs: Date.now() - startTime,
    });
    const reason = outcome === 'no_key' || outcome === 'key_mismatch' ? outcome : undefined;
    return { matches: !reason, reason, outcome, deploymentId, region, integrations };
  };

  const outcome = exceedsRenderCap
    ? 'key_unavailable'
    : await getIacKeyOutcome(soClient, attributes, integrations, {
        flow: IAC_KEY_CHECK_FLOW,
        contextForLog: `connector ${cloudConnectorId}`,
      });
  // Only a plain re-check describes the connector as it is stored; an onboarding check
  // carries integrations the user has not saved yet, so its verdict must not be written down.
  if (!isAddingIntegrations) {
    await persistUpgradeStatus(
      soClient,
      cloudConnectorId,
      attributes.iac_upgrade_status,
      outcome,
      surface,
      logger
    );
  }
  return finish(outcome);
};
