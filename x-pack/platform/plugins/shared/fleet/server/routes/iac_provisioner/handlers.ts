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
import { iacCallbackService } from '../../services/iac_callback';
import {
  buildIacProvisionerIntegrations,
  isBuildError,
} from '../../services/iac_provisioner_integrations';
import { appContextService } from '../../services/app_context';
import { isIacProvisionerEnabled } from '../../services/utils/iac_provisioner';
import { isAwsIdentityFederationEnabled } from '../../services/utils/aws_identity_federation';
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
import type {
  CreateIacCallbackRequestSchema,
  GetIacCallbackRequestSchema,
  ReceiveIacCallbackRequestSchema,
} from '../../types/rest_spec/iac_callback';
import type { IacCallback } from '../../../common/types/models/iac_callback';
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

const CALLBACK_NOT_FOUND = { body: { message: 'Callback not found' } };

/**
 * Records are space-agnostic because the stack calls Kibana without a space. The browser routes
 * only return records from the space the launch happened in; others read as missing.
 */
const getCallbackInSpace = async (
  id: string,
  spaceId: string
): Promise<IacCallback | undefined> => {
  const item = await iacCallbackService.get(
    appContextService.getInternalUserSOClientWithoutSpaceExtension(),
    id
  );
  return item && item.space_id === spaceId ? item : undefined;
};

export const createIacCallbackHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreateIacCallbackRequestSchema.body>
> = async (context, request, response) => {
  if (!(await isAwsIdentityFederationEnabled())) {
    return response.notFound({ body: { message: 'AWS identity federation is not enabled' } });
  }
  const { spaceId } = await context.fleet;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  const { provider, ...identity } = request.body;

  // Internal clients: creating the key must not need the user's `manage_api_key` privilege (it
  // is unavailable on Serverless), and the type is space-agnostic.
  const { item, apiKey } = await iacCallbackService.create(
    appContextService.getInternalUserSOClientWithoutSpaceExtension(),
    appContextService.getInternalUserESClient(),
    { provider, createdBy: user?.username, spaceId, identity }
  );

  return response.ok({ body: { item, api_key: apiKey } });
};

export const getIacCallbackHandler: FleetRequestHandler<
  TypeOf<typeof GetIacCallbackRequestSchema.params>
> = async (context, request, response) => {
  const { spaceId } = await context.fleet;
  const item = await getCallbackInSpace(request.params.callbackId, spaceId);
  if (!item) {
    return response.notFound(CALLBACK_NOT_FOUND);
  }
  return response.ok({ body: { item } });
};

/**
 * Called by the stack's Lambda. Kibana has already authenticated the API key; the service then
 * checks that it is this record's key.
 */
export const receiveIacCallbackHandler: FleetRequestHandler<
  TypeOf<typeof ReceiveIacCallbackRequestSchema.params>,
  undefined,
  TypeOf<typeof ReceiveIacCallbackRequestSchema.body>
> = async (context, request, response) => {
  const logger = appContextService.getLogger().get('IacProvisioner receiveIacCallbackHandler');
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request);
  const apiKeyId = user?.authentication_type === 'api_key' ? user.api_key?.id : undefined;

  const result = await iacCallbackService.receive(
    appContextService.getInternalUserSOClientWithoutSpaceExtension(),
    request.params.callbackId,
    { apiKeyId, payload: request.body }
  );
  // Never log the key.
  logger.debug(`IaC callback [id=${request.params.callbackId}] outcome=${result.outcome}`);

  switch (result.outcome) {
    case 'received':
      return response.ok({ body: { status: result.item.status } });
    case 'not_found':
      return response.notFound(CALLBACK_NOT_FOUND);
    case 'conflict':
      return response.conflict({
        body: { message: 'Callback already received with different values' },
      });
    case 'gone':
      return response.customError({
        statusCode: 410,
        body: { message: 'Callback is no longer accepting values' },
      });
    case 'invalid':
      return response.badRequest({ body: { message: result.message } });
  }
};
