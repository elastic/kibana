/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { KibanaResponseFactory } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { iacProvisionerService } from '../../services';
import {
  buildIacProvisionerIntegrations,
  isBuildError,
} from '../../services/iac_provisioner_integrations';
import { appContextService } from '../../services/app_context';
import { isIacProvisionerEnabled } from '../../services/utils/iac_provisioner';
import {
  reportIacProvisionerRenderCompleted,
  reportIacProvisionerRenderRequested,
} from '../../services/telemetry/iac_provisioner_telemetry';
import {
  IacProvisionerRequestError,
  IacProvisionerUnavailableError,
  PackageNotFoundError,
} from '../../errors';
import { getErrorMessage } from '../../errors/utils';
import type { FleetRequestHandler } from '../../types';
import type { RenderIacTemplateRequestSchema } from '../../types/rest_spec/iac_provisioner';
import type { IacProvisionerRenderFlow } from '../../../common/telemetry/iac_provisioner_events';

export const renderIacTemplateHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof RenderIacTemplateRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const logger = appContextService.getLogger().get('IacProvisioner renderIacTemplateHandler');
  const {
    provider,
    flow,
    workflow,
    templateSha,
    integrations: requestedIntegrations,
  } = request.body;

  const iacProvisionerEnabled = await isIacProvisionerEnabled();
  if (!iacProvisionerEnabled) {
    return response.notFound({
      body: { message: 'IaC Provisioner is not enabled' },
    });
  }

  const startTime = Date.now();
  try {
    const built = await buildIacProvisionerIntegrations({
      savedObjectsClient: internalSoClient,
      requestedIntegrations,
    });
    if (isBuildError(built)) {
      return response.badRequest({ body: { message: built.errorMessage } });
    }
    const { integrations } = built;

    reportIacProvisionerRenderRequested({
      flow,
      integrationCount: integrations.length,
    });

    const rendered = await iacProvisionerService.renderTemplate({
      provider,
      workflow,
      integrations,
      ...(templateSha ? { templateSha } : {}),
    });

    reportIacProvisionerRenderCompleted({
      flow,
      success: true,
      httpStatus: 200,
      errorCodes: [],
      latencyMs: Date.now() - startTime,
    });
    return response.ok({ body: rendered });
  } catch (error) {
    return mapIacProvisionerRouteError({
      error,
      flow,
      startTime,
      logger,
      response,
      unexpectedMessage: 'An unexpected error occurred while rendering the IaC template',
    });
  }
};

const mapIacProvisionerRouteError = ({
  error,
  flow,
  startTime,
  logger,
  response,
  unexpectedMessage,
}: {
  error: unknown;
  flow: IacProvisionerRenderFlow;
  startTime: number;
  logger: Logger;
  response: KibanaResponseFactory;
  unexpectedMessage: string;
}) => {
  const latencyMs = Date.now() - startTime;

  if (error instanceof IacProvisionerRequestError) {
    reportIacProvisionerRenderCompleted({
      flow,
      success: false,
      httpStatus: error.statusCode,
      errorCodes: error.errorCodes,
      latencyMs,
    });
    // 422 (package not renderable) passes through for the client's fallback
    // decision. Any other provider 4xx means the broker built a bad request
    // — surfaced as 502 so e.g. a provider 401/403 can't reach the browser
    // and trip Kibana's session-expiry handling.
    return response.customError({
      statusCode: error.statusCode === 422 ? 422 : 502,
      body: { message: error.message, attributes: { errorCodes: error.errorCodes } },
    });
  }

  if (error instanceof IacProvisionerUnavailableError) {
    reportIacProvisionerRenderCompleted({
      flow,
      success: false,
      httpStatus: error.statusCode ?? 0,
      errorCodes: [],
      latencyMs,
    });
    return response.customError({
      statusCode: 502,
      body: { message: error.message },
    });
  }

  // A requested package doesn't exist (getPackageInfo throws
  // PackageNotFoundError) — a caller mistake, not a server failure, so no
  // error-level log.
  if (error instanceof PackageNotFoundError) {
    reportIacProvisionerRenderCompleted({
      flow,
      success: false,
      httpStatus: 404,
      errorCodes: [],
      latencyMs,
    });
    return response.notFound({
      body: { message: error.message },
    });
  }

  logger.error(`Failed IaC Provisioner request: ${getErrorMessage(error)}`);
  reportIacProvisionerRenderCompleted({
    flow,
    success: false,
    httpStatus: 500,
    errorCodes: [],
    latencyMs,
  });
  // The raw error may carry internal details (hostnames, stack context) or
  // be undefined for non-Error throws — keep it in the log and return a
  // stable, generic message to the client.
  return response.customError({
    statusCode: 500,
    body: { message: unexpectedMessage },
  });
};
