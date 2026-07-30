/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { iacProviderService } from '../../services';
import type { IacProviderRenderIntegration } from '../../services/iac_provider';
import { appContextService } from '../../services/app_context';
import { getPackageInfo } from '../../services/epm/packages';
import { isIacProviderEnabled } from '../../services/utils/iac_provider';
import {
  reportIacProviderRenderCompleted,
  reportIacProviderRenderRequested,
} from '../../services/telemetry/iac_provider_telemetry';
import {
  FleetNotFoundError,
  IacProviderRenderError,
  IacProviderUnavailableError,
} from '../../errors';
import type { FleetRequestHandler } from '../../types';
import type { RenderIacTemplateRequestSchema } from '../../types/rest_spec/iac_provider';

export const renderIacTemplateHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof RenderIacTemplateRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const logger = appContextService.getLogger().get('IacProvider renderIacTemplateHandler');
  const { provider, flow, integrations: requestedIntegrations } = request.body;

  if (!isIacProviderEnabled()) {
    return response.notFound({
      body: { message: 'IaC Provider is not enabled' },
    });
  }

  const startTime = Date.now();
  try {
    const integrations: IacProviderRenderIntegration[] = await Promise.all(
      requestedIntegrations.map(async ({ name: pkgName, policyTemplates }) => {
        // Empty pkgVersion resolves to the installed version, falling back to
        // the latest available: at connector-creation time the package may not
        // be installed yet.
        const packageInfo = await getPackageInfo({
          savedObjectsClient: internalSoClient,
          pkgName,
          pkgVersion: '',
        });

        const inputs = (packageInfo.policy_templates ?? [])
          .filter(({ name }) => policyTemplates.includes(name))
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

    reportIacProviderRenderRequested({
      flow,
      integrationCount: integrations.length,
    });

    const rendered = await iacProviderService.renderTemplate({ provider, integrations });

    reportIacProviderRenderCompleted({
      flow,
      success: true,
      httpStatus: 200,
      errorCodes: [],
      latencyMs: Date.now() - startTime,
    });
    return response.ok({ body: rendered });
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    if (error instanceof IacProviderRenderError) {
      reportIacProviderRenderCompleted({
        flow,
        success: false,
        httpStatus: error.statusCode,
        errorCodes: error.errorCodes,
        latencyMs,
      });
      // 4xx from the provider passes through so the client can decide whether
      // the static-template fallback applies (422 = package not renderable).
      return response.customError({
        statusCode: error.statusCode,
        body: { message: error.message, attributes: { errorCodes: error.errorCodes } },
      });
    }

    if (error instanceof IacProviderUnavailableError) {
      reportIacProviderRenderCompleted({
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
      reportIacProviderRenderCompleted({
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

    logger.error(`Failed to render IaC template: ${error.message}`);
    reportIacProviderRenderCompleted({
      flow,
      success: false,
      httpStatus: 500,
      errorCodes: [],
      latencyMs,
    });
    return response.customError({
      statusCode: 500,
      body: { message: error.message },
    });
  }
};
