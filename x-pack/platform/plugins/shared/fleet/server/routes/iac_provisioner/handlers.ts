/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { KibanaResponseFactory, SavedObjectsClientContract } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { iacProvisionerService } from '../../services';
import type { IacProvisionerRenderIntegration } from '../../services/iac_provisioner';
import { appContextService } from '../../services/app_context';
import { getPackageInfo } from '../../services/epm/packages';
import { isIacProvisionerEnabled } from '../../services/utils/iac_provisioner';
import {
  reportIacProvisionerRenderCompleted,
  reportIacProvisionerRenderRequested,
  reportIacProvisionerResolveCompleted,
  reportIacProvisionerResolveRequested,
} from '../../services/telemetry/iac_provisioner_telemetry';
import {
  IacProvisionerRequestError,
  IacProvisionerUnavailableError,
  PackageNotFoundError,
} from '../../errors';
import { getErrorMessage } from '../../errors/utils';
import type { FleetRequestHandler } from '../../types';
import type {
  RenderIacTemplateRequestSchema,
  ResolveIacBlueprintsRequestSchema,
} from '../../types/rest_spec/iac_provisioner';
import type { IacPolicyTemplateSelection } from '../../../common/types/rest_spec/iac_provisioner';
import type { IacProvisionerRenderFlow } from '../../../common/telemetry/iac_provisioner_events';

interface RequestedIntegration {
  name: string;
  policyTemplates: IacPolicyTemplateSelection[];
}

/**
 * Merges duplicate package entries and unions enabledInputs per policy
 * template, then loads each package and validates that every requested
 * template and input exists on the manifest. The package version is taken
 * from the registry so callers do not have to supply it.
 */
export const buildIacProvisionerIntegrations = async ({
  savedObjectsClient,
  requestedIntegrations,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  requestedIntegrations: RequestedIntegration[];
}): Promise<IacProvisionerRenderIntegration[] | { errorMessage: string }> => {
  const templatesByPackage = new Map<string, Map<string, Set<string>>>();
  for (const { name, policyTemplates } of requestedIntegrations) {
    const templates = templatesByPackage.get(name) ?? new Map<string, Set<string>>();
    for (const { name: templateName, enabledInputs } of policyTemplates) {
      const inputs = templates.get(templateName) ?? new Set<string>();
      for (const input of enabledInputs) {
        inputs.add(input);
      }
      templates.set(templateName, inputs);
    }
    templatesByPackage.set(name, templates);
  }

  const integrations: IacProvisionerRenderIntegration[] = [];
  for (const [pkgName, policyTemplates] of templatesByPackage) {
    // Empty pkgVersion resolves to the installed version, falling back to
    // the latest available: at connector-creation time the package may not
    // be installed yet. skipArchive: registry info covers everything read
    // here; without it each request downloads and unpacks the archive.
    const packageInfo = await getPackageInfo({
      savedObjectsClient,
      pkgName,
      pkgVersion: '',
      skipArchive: true,
    });

    const resolvedPolicyTemplates: IacPolicyTemplateSelection[] = [];
    for (const [templateName, enabledInputSet] of policyTemplates) {
      const template = (packageInfo.policy_templates ?? []).find(
        ({ name }) => name === templateName
      );
      if (!template) {
        return {
          errorMessage: `${pkgName} has no policy template named ${templateName}`,
        };
      }
      const inputs = 'inputs' in template ? template.inputs ?? [] : [];
      const declaredInputs = new Set(inputs.map(({ type }) => type));
      const enabledInputs = Array.from(enabledInputSet);
      const unknown = enabledInputs.filter((type) => !declaredInputs.has(type));
      if (unknown.length) {
        return {
          errorMessage: `${pkgName} policy template ${templateName} has no inputs named ${unknown.join(
            ', '
          )}`,
        };
      }
      resolvedPolicyTemplates.push({ name: templateName, enabledInputs });
    }

    integrations.push({
      name: pkgName,
      version: packageInfo.version,
      policyTemplates: resolvedPolicyTemplates,
    });
  }

  return integrations;
};

const isBuildError = (
  result: IacProvisionerRenderIntegration[] | { errorMessage: string }
): result is { errorMessage: string } => 'errorMessage' in result;

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
    blueprintId,
    integrations: requestedIntegrations,
    userParams,
  } = request.body;

  if (!isIacProvisionerEnabled()) {
    return response.notFound({
      body: { message: 'IaC Provisioner is not enabled' },
    });
  }

  const startTime = Date.now();
  try {
    const integrations = await buildIacProvisionerIntegrations({
      savedObjectsClient: internalSoClient,
      requestedIntegrations,
    });
    if (isBuildError(integrations)) {
      return response.badRequest({ body: { message: integrations.errorMessage } });
    }

    reportIacProvisionerRenderRequested({
      flow,
      integrationCount: integrations.length,
    });

    const rendered = await iacProvisionerService.renderTemplate({
      provider,
      blueprintId,
      integrations,
      ...(userParams ? { userParams } : {}),
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
      reportCompleted: reportIacProvisionerRenderCompleted,
    });
  }
};

export const resolveIacBlueprintsHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof ResolveIacBlueprintsRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const logger = appContextService.getLogger().get('IacProvisioner resolveIacBlueprintsHandler');
  const { provider, flow, integrations: requestedIntegrations } = request.body;

  if (!isIacProvisionerEnabled()) {
    return response.notFound({
      body: { message: 'IaC Provisioner is not enabled' },
    });
  }

  const startTime = Date.now();
  try {
    const integrations = await buildIacProvisionerIntegrations({
      savedObjectsClient: internalSoClient,
      requestedIntegrations,
    });
    if (isBuildError(integrations)) {
      return response.badRequest({ body: { message: integrations.errorMessage } });
    }

    reportIacProvisionerResolveRequested({
      flow,
      integrationCount: integrations.length,
    });

    const resolved = await iacProvisionerService.resolveBlueprints({ provider, integrations });

    reportIacProvisionerResolveCompleted({
      flow,
      success: true,
      httpStatus: 200,
      blueprintCount: resolved.blueprints.length,
      deployableCount: resolved.blueprints.filter(({ deployable }) => deployable).length,
      notCoveredReasons: uniqueNotCoveredReasons(resolved.blueprints),
      latencyMs: Date.now() - startTime,
    });
    return response.ok({ body: resolved });
  } catch (error) {
    // 501: the provisioner has registered the route but not the resolver yet.
    // Treat that as "nothing deployable" so the client falls back to the
    // static template instead of surfacing a 5xx.
    if (error instanceof IacProvisionerUnavailableError && error.statusCode === 501) {
      reportIacProvisionerResolveCompleted({
        flow,
        success: false,
        httpStatus: 501,
        blueprintCount: 0,
        deployableCount: 0,
        notCoveredReasons: [],
        latencyMs: Date.now() - startTime,
      });
      return response.ok({ body: { blueprints: [] } });
    }

    return mapIacProvisionerRouteError({
      error,
      flow,
      startTime,
      logger,
      response,
      unexpectedMessage: 'An unexpected error occurred while resolving IaC blueprints',
      reportCompleted: ({ flow: completedFlow, success, httpStatus, latencyMs }) =>
        reportIacProvisionerResolveCompleted({
          flow: completedFlow,
          success,
          httpStatus,
          latencyMs,
          blueprintCount: 0,
          deployableCount: 0,
          notCoveredReasons: [],
        }),
    });
  }
};

const uniqueNotCoveredReasons = (
  blueprints: Array<{ notCovered: Array<{ reason: string }> }>
): string[] => [
  ...new Set(blueprints.flatMap(({ notCovered }) => notCovered.map(({ reason }) => reason))),
];

const mapIacProvisionerRouteError = ({
  error,
  flow,
  startTime,
  logger,
  response,
  unexpectedMessage,
  reportCompleted,
}: {
  error: unknown;
  flow: IacProvisionerRenderFlow;
  startTime: number;
  logger: Logger;
  response: KibanaResponseFactory;
  unexpectedMessage: string;
  reportCompleted: (fields: {
    flow: IacProvisionerRenderFlow;
    success: false;
    httpStatus: number;
    errorCodes: string[];
    latencyMs: number;
  }) => void;
}) => {
  const latencyMs = Date.now() - startTime;

  if (error instanceof IacProvisionerRequestError) {
    reportCompleted({
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
    reportCompleted({
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
    reportCompleted({
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
  reportCompleted({
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
