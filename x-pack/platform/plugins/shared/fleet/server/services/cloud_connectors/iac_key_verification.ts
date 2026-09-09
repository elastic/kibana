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
  type IacKeyCheckReason,
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

export interface IacKeyVerification {
  matches: boolean;
  reason?: IacKeyCheckReason;
  /** From `iac_deployment_id`; absent for legacy connectors. */
  deploymentId?: string;
  /** Parsed from the deployment id (AWS ARN); absent when the id is absent or malformed. */
  region?: string;
  /** The connector's live integration set merged with the requested one — the browser renders exactly this. */
  integrations: IacIntegrationSelection[];
}

export interface CheckIacTemplateOptions {
  /** Telemetry flow for the render_requested/completed events. */
  flow: IacProvisionerRenderFlow;
  /** Short label for log lines, e.g. `connector cc-1`. */
  contextForLog: string;
}

/**
 * IaCP's verdict on the stored digest for this integration set, or undefined when it cannot be
 * determined (provider unreachable, pre-contract provider, unknown package, nothing renderable).
 * Undefined always means "fail open" for callers.
 * Callers must already have checked `isIacProvisionerSupportedFor` (an IaCP-disabled config error
 * would otherwise be reported as a failed render) and must hold a digest to compare — a connector
 * without one is `no_key`, which `compareIacKey` answers without a provider call.
 */
export const checkIacTemplate = async (
  soClient: SavedObjectsClientContract,
  provider: typeof AWS_CLOUD_PROVIDER,
  selections: IacIntegrationSelection[],
  storedSha: string,
  { flow, contextForLog }: CheckIacTemplateOptions
): Promise<{ render: boolean; templateSha: string } | undefined> => {
  const logger = appContextService.getLogger().get('IacKeyVerification');
  const startTime = Date.now();
  try {
    const { integrations, skipped } = await resolveIacRenderIntegrations(
      soClient,
      provider,
      selections
    );
    // The render route rejects any set with skipped packages, so a digest computed over the
    // survivors could never describe what the user deployed. Cannot compare → fail open.
    if (integrations.length === 0 || skipped.length > 0) {
      logger.debug(
        `No comparable ${provider} integration set for ${contextForLog} (renderable: ${
          integrations.length
        }, skipped: ${skipped.join(',') || 'none'}); nothing to compare`
      );
      return undefined;
    }
    reportIacProvisionerRenderRequested({ flow, integrationCount: integrations.length });
    const { render, templateSha } = await iacProvisionerService.render({
      provider,
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
    if (render === undefined || templateSha === undefined) {
      // A provider predating the render/templateSha contract cannot answer the question.
      // The service already warned about it, so this side only records the consequence.
      // https://github.com/elastic/ingest-dev/issues/9415
      logger.debug(
        `IaC template check skipped for ${contextForLog} (fail open): provider returned no render/templateSha`
      );
      return undefined;
    }
    logger.debug(
      `Provider compared ${contextForLog}: stored ${storedSha}, current ${templateSha}, render=${render}`
    );
    return { render, templateSha };
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
      `IaC template check skipped for ${contextForLog} (fail open): ${getErrorMessage(error)}`
    );
    return undefined;
  }
};

/**
 * The shared comparison both the verify route and the daily upgrade task run: gate the provider,
 * then let IaCP compare the connector's stored `iac_key` (IaCP's `templateSha`) with what it would
 * render now. Never throws for IaCP problems (`key_unavailable` = fail open); SO errors from the
 * caller's own reads propagate before this runs.
 */
export const compareIacKey = async (
  soClient: SavedObjectsClientContract,
  {
    cloudProvider,
    iac_key: storedKey,
  }: Pick<CloudConnectorSOAttributes, 'cloudProvider' | 'iac_key'>,
  integrations: IacIntegrationSelection[],
  { flow, contextForLog }: CheckIacTemplateOptions
): Promise<IacKeyVerificationOutcome> => {
  // The literal comparison narrows the provider for the render call; the gate adds the
  // "IaCP enabled" half.
  if (cloudProvider !== AWS_CLOUD_PROVIDER || !isIacProvisionerSupportedFor(cloudProvider)) {
    return 'unsupported_provider';
  }
  if (integrations.length === 0) {
    return 'no_integrations';
  }
  const logger = appContextService.getLogger().get('IacKeyVerification');
  // No stored digest means the static template is deployed — a fact about this connector
  // that holds whether or not IaCP is reachable, so it is reported without asking.
  if (!storedKey?.trim()) {
    logger.debug(`No stored IaC key for ${contextForLog}; static template deployed`);
    return 'no_key';
  }
  logger.debug(
    `Comparing stored key ${storedKey} for ${contextForLog} against integration set ${JSON.stringify(
      integrations
    )}`
  );
  const result = await checkIacTemplate(soClient, cloudProvider, integrations, storedKey.trim(), {
    flow,
    contextForLog,
  });
  if (result === undefined) {
    return 'key_unavailable';
  }
  return result.render ? 'key_mismatch' : 'matches';
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
          ? ` — adding ${newIntegration.name}[${newIntegration.policyTemplates
              .map(({ name }) => name)
              .join(',')}]`
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

  return finish(
    await compareIacKey(soClient, attributes, integrations, {
      flow: IAC_KEY_CHECK_FLOW,
      contextForLog: `connector ${cloudConnectorId}`,
    })
  );
};
