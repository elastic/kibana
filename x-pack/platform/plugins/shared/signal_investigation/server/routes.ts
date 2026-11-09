/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaResponseFactory, RouteValidationFunction } from '@kbn/core/server';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import type { InvestigationSeed } from '@kbn/investigation-seed';
import { investigationSeedSchema } from '@kbn/investigation-seed';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { SignalAnalyzer } from '@kbn/signal-investigation-contract';
import { SIGNAL_INVESTIGATION_ANALYZERS_PATH, signalInvestigationLeadsPath } from '../common/api';
import type { AnalyzerRegistry } from './analyzer_registry';
import { runLeadAnalysis, type LeadAnalysisOutcome } from './lead_analysis';
import { catalogRouteSecurity, routeSecurityForAuthz } from './route_security';

const CLIENT_CLOSED_REQUEST = {
  statusCode: 499,
  body: { message: 'Client closed request' },
};

const respond = (response: KibanaResponseFactory, outcome: LeadAnalysisOutcome) => {
  if (outcome.kind === 'forbidden') {
    return response.forbidden({ body: outcome.message });
  }
  if (outcome.kind === 'closed') {
    return response.custom(CLIENT_CLOSED_REQUEST);
  }
  return response.ok({ body: outcome.body });
};

const validateSeed: RouteValidationFunction<InvestigationSeed> = (data, validationResult) => {
  const parsed = investigationSeedSchema.safeParse(data);
  if (!parsed.success) {
    return validationResult.badRequest(
      parsed.error.issues.map((issue) => issue.message).join('; '),
      ['body']
    );
  }
  return validationResult.ok(parsed.data);
};

export const registerCatalogRoute = (router: IRouter, registry: AnalyzerRegistry): void => {
  router.versioned
    .get({
      access: 'internal',
      path: SIGNAL_INVESTIGATION_ANALYZERS_PATH,
      security: catalogRouteSecurity(),
    })
    .addVersion({ version: '1', validate: false }, async (_context, _request, response) => {
      return response.ok({
        body: {
          analyzers: registry.list().map((analyzer) => ({
            id: analyzer.id,
            displayName: analyzer.displayName,
          })),
        },
      });
    });
};

export const registerLeadRoute = (router: IRouter, analyzer: SignalAnalyzer): void => {
  router.versioned
    .post({
      access: 'internal',
      path: signalInvestigationLeadsPath(analyzer.id),
      security: routeSecurityForAuthz(analyzer.authz),
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: validateSeed } },
      },
      async (context, request, response) => {
        const licensing = await (
          context as unknown as { licensing: Promise<LicensingApiRequestHandlerContext> }
        ).licensing;
        const outcome = await runLeadAnalysis({
          analyzer,
          seed: request.body,
          deps: { request, context },
          abortSignal: getRequestAbortedSignal(request.events.aborted$),
          license: licensing.license,
        });
        return respond(response, outcome);
      }
    );
};
