/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { iacProvisionerService } from '../../services';
import type { IacProvisionerRenderIntegration } from '../../services/iac_provisioner';
import { appContextService } from '../../services/app_context';
import { getPackageInfo } from '../../services/epm/packages';
import { isIacProvisionerEnabled } from '../../services/utils/iac_provisioner';
import {
  reportIacProvisionerRenderCompleted,
  reportIacProvisionerRenderRequested,
} from '../../services/telemetry/iac_provisioner_telemetry';
import {
  FleetNotFoundError,
  IacProvisionerRenderError,
  IacProvisionerUnavailableError,
} from '../../errors';
import { getErrorMessage } from '../../errors/utils';
import type { FleetRequestHandler } from '../../types';
import type { RenderIacTemplateRequestSchema } from '../../types/rest_spec/iac_provisioner';

export const renderIacTemplateHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof RenderIacTemplateRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const logger = appContextService.getLogger().get('IacProvisioner renderIacTemplateHandler');
  const { provider, flow, integrations: requestedIntegrations } = request.body;

  if (!isIacProvisionerEnabled()) {
    return response.notFound({
      body: { message: 'IaC Provisioner is not enabled' },
    });
  }

  // The render request must not repeat a package name, so entries sharing a
  // package are merged into one with the union of their policy templates.
  const templatesByPackage = new Map<string, Set<string>>();
  for (const { name, policyTemplates } of requestedIntegrations) {
    const templates = templatesByPackage.get(name) ?? new Set<string>();
    for (const template of policyTemplates) {
      templates.add(template);
    }
    templatesByPackage.set(name, templates);
  }

  const startTime = Date.now();
  try {
    const integrations: IacProvisionerRenderIntegration[] = await Promise.all(
      Array.from(templatesByPackage, async ([pkgName, policyTemplates]) => {
        // Empty pkgVersion resolves to the installed version, falling back to
        // the latest available: at connector-creation time the package may not
        // be installed yet. skipArchive: registry info covers everything read
        // here; without it each request downloads and unpacks the archive.
        const packageInfo = await getPackageInfo({
          savedObjectsClient: internalSoClient,
          pkgName,
          pkgVersion: '',
          skipArchive: true,
        });

        const inputs = (packageInfo.policy_templates ?? [])
          .filter(({ name }) => policyTemplates.has(name))
          .flatMap((template) => ('inputs' in template ? template.inputs ?? [] : []));
        // MVP heuristic pending confirmation with the provisioner team
        // (OQ-A in security-team#18632): only provider-relevant input types
        // are sent, since mixed-provider policy templates (e.g. CSPM) would
        // otherwise pull blueprints targeting other canonical templates.
        const enabledInputs = Array.from(
          new Set(
            inputs.map(({ type }) => type).filter((type) => type.toLowerCase().includes(provider))
          )
        );

        return {
          name: pkgName,
          version: packageInfo.version,
          enabledInputs,
        };
      })
    );

    // An integration with no provider-relevant inputs cannot contribute to
    // the template; sending it would only produce confusing provider errors.
    const emptyIntegration = integrations.find(({ enabledInputs }) => !enabledInputs.length);
    if (emptyIntegration) {
      return response.badRequest({
        body: {
          message: `${emptyIntegration.name} has no ${provider} inputs under the requested policy templates`,
        },
      });
    }

    reportIacProvisionerRenderRequested({
      flow,
      integrationCount: integrations.length,
    });

    const rendered = await iacProvisionerService.renderTemplate({ provider, integrations });

    reportIacProvisionerRenderCompleted({
      flow,
      success: true,
      httpStatus: 200,
      errorCodes: [],
      latencyMs: Date.now() - startTime,
    });
    return response.ok({ body: rendered });
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    if (error instanceof IacProvisionerRenderError) {
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

    // A requested package doesn't exist (getPackageInfo) — a caller mistake,
    // not a server failure, so no error-level log.
    if (error instanceof FleetNotFoundError) {
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

    logger.error(`Failed to render IaC template: ${getErrorMessage(error)}`);
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
      body: { message: 'An unexpected error occurred while rendering the IaC template' },
    });
  }
};
