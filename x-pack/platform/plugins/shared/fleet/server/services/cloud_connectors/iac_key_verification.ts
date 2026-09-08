/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { parseAwsRegionFromArn } from '../../../common/services/cloud_connectors';
import {
  IAC_KEY_CHECK_FLOW,
  type IacKeySurface,
  type IacKeyVerificationOutcome,
  type IacProvisionerRenderFlow,
} from '../../../common/telemetry/iac_provisioner_events';
import { AWS_CLOUD_PROVIDER } from '../../../common/types/models/cloud_connector';
import type { CloudConnectorSOAttributes } from '../../types/so_attributes';
import {
  IacProvisionerRenderError,
  IacProvisionerUnavailableError,
  PackageNotFoundError,
} from '../../errors';
import { getErrorMessage } from '../../errors/utils';
import { appContextService } from '../app_context';
import { iacProvisionerService } from '../iac_provisioner';
import {
  reportIacProvisionerKeyVerificationCompleted,
  reportIacProvisionerRenderCompleted,
  reportIacProvisionerRenderRequested,
} from '../telemetry/iac_provisioner_telemetry';
import { isIacProvisionerSupportedFor } from '../utils/iac_provisioner';

import {
  getCloudConnectorIntegrationSelections,
  mergeIntegrationSelections,
  resolveIacRenderIntegrations,
  type IacIntegrationSelection,
} from './iac_integrations';

export type IacKeyMismatchReason = 'no_key' | 'key_mismatch';

export interface IacKeyVerification {
  matches: boolean;
  reason?: IacKeyMismatchReason;
  /** From `iac_deployment_id`; absent for legacy connectors. */
  deploymentId?: string;
  /** Parsed from the deployment id (AWS ARN); absent when the id is absent or malformed. */
  region?: string;
  /** The connector's live integration set merged with the requested one — the browser renders exactly this. */
  integrations: IacIntegrationSelection[];
}

/** No stored key means the static template is deployed and must be reported, not skipped. */
export const computeIacKeyMismatch = (
  storedKey: string | undefined,
  currentKey: string
): IacKeyMismatchReason | undefined => {
  const stored = storedKey?.trim();
  if (!stored) {
    return 'no_key';
  }
  return stored === currentKey ? undefined : 'key_mismatch';
};

export interface GetCurrentIacKeyOptions {
  /** Telemetry flow for the render_requested/completed events. */
  flow: IacProvisionerRenderFlow;
  /** Short label for log lines, e.g. `connector cc-1`. */
  contextForLog: string;
}

/**
 * The key IaCP would produce today for this integration set, or undefined when it cannot be
 * determined (provider unreachable, pre-`render=false` provider, unknown package, nothing
 * renderable). Undefined always means "fail open" for callers.
 * Callers must already have checked `isIacProvisionerSupportedFor`; an IaCP-disabled config
 * error would otherwise be reported as a failed render.
 */
export const getCurrentIacKey = async (
  soClient: SavedObjectsClientContract,
  provider: typeof AWS_CLOUD_PROVIDER,
  selections: IacIntegrationSelection[],
  { flow, contextForLog }: GetCurrentIacKeyOptions
): Promise<string | undefined> => {
  const logger = appContextService.getLogger().get('IacKeyVerification');
  const startTime = Date.now();
  try {
    const { integrations, skipped } = await resolveIacRenderIntegrations(
      soClient,
      provider,
      selections
    );
    // The render route rejects any set with skipped packages, so a key computed over the
    // survivors could never match a stored key. Cannot compare → fail open.
    if (integrations.length === 0 || skipped.length > 0) {
      logger.debug(
        `No comparable ${provider} integration set for ${contextForLog} (renderable: ${
          integrations.length
        }, skipped: ${skipped.join(',') || 'none'}); nothing to compare`
      );
      return undefined;
    }
    reportIacProvisionerRenderRequested({ flow, integrationCount: integrations.length });
    const { key } = await iacProvisionerService.renderKey({ provider, integrations });
    reportIacProvisionerRenderCompleted({
      flow,
      success: true,
      httpStatus: 200,
      errorCodes: [],
      latencyMs: Date.now() - startTime,
    });
    logger.debug(`Current IaC key for ${contextForLog}: ${key}`);
    return key;
  } catch (error) {
    // Mirror the render route's telemetry mapping: provider status when we have one, 404 for a
    // package that no longer exists, 500 for anything else; 0 is reserved for "no response".
    const httpStatus =
      error instanceof IacProvisionerRenderError || error instanceof IacProvisionerUnavailableError
        ? error.statusCode ?? 0
        : error instanceof PackageNotFoundError
        ? 404
        : 500;
    const errorCodes = error instanceof IacProvisionerRenderError ? error.errorCodes : [];
    reportIacProvisionerRenderCompleted({
      flow,
      success: false,
      httpStatus,
      errorCodes,
      latencyMs: Date.now() - startTime,
    });
    logger.warn(
      `IaC key check skipped for ${contextForLog} (fail open): ${getErrorMessage(error)}`
    );
    return undefined;
  }
};

export const verifyCloudConnectorIacKey = async (
  soClient: SavedObjectsClientContract,
  cloudConnectorId: string,
  newIntegration?: IacIntegrationSelection
): Promise<IacKeyVerification> => {
  const logger = appContextService.getLogger().get('IacKeyVerification');
  const startTime = Date.now();
  const surface: IacKeySurface = newIntegration ? 'wizard' : 'flyout';

  // SO reads propagate (the route maps them to 404/500); only the render call fails open —
  // answering "up to date" during an SO outage would be the worse lie.
  const { attributes } = await soClient.get<CloudConnectorSOAttributes>(
    CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
    cloudConnectorId
  );
  const existing = await getCloudConnectorIntegrationSelections(soClient, cloudConnectorId);
  const integrations = mergeIntegrationSelections(
    newIntegration ? [...existing, newIntegration] : existing
  );
  const deploymentId = attributes.iac_deployment_id || undefined;
  const region = parseAwsRegionFromArn(deploymentId);
  const { cloudProvider } = attributes;

  const finish = (outcome: IacKeyVerificationOutcome): IacKeyVerification => {
    logger.info(
      `IaC key check for connector ${cloudConnectorId} (${surface}, ${cloudProvider}): ${outcome}` +
        (newIntegration
          ? ` — adding ${newIntegration.name}[${newIntegration.policyTemplates.join(',')}]`
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
    return { matches: !reason, reason, deploymentId, region, integrations };
  };

  // The literal comparison narrows the type for renderKey; the gate adds the "IaCP enabled" half.
  if (cloudProvider !== AWS_CLOUD_PROVIDER || !isIacProvisionerSupportedFor(cloudProvider)) {
    return finish('unsupported_provider');
  }
  if (integrations.length === 0) {
    return finish('no_integrations');
  }

  logger.debug(
    `Comparing stored key ${
      attributes.iac_key ?? '<none>'
    } for connector ${cloudConnectorId} against integration set ${JSON.stringify(integrations)}`
  );
  const currentKey = await getCurrentIacKey(soClient, cloudProvider, integrations, {
    flow: IAC_KEY_CHECK_FLOW,
    contextForLog: `connector ${cloudConnectorId}`,
  });
  if (currentKey === undefined) {
    return finish('key_unavailable');
  }

  const mismatch = computeIacKeyMismatch(attributes.iac_key, currentKey);
  if (!mismatch) {
    return finish('matches');
  }
  return finish(mismatch);
};
