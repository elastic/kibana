/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  errorResponseSchema,
  importIdParamsSchema,
  testImportRequestSchema,
  testImportResponseSchema,
  type ImportIdParams,
  type TestImportRequest,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { ImportSetupService } from '../../lib/import_setup';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_INTERNAL_IMPORT_API_PATH } from '../constants';

@injectable()
export class TestImportRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_INTERNAL_IMPORT_API_PATH}/{id}/_test`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.importConfigs.write],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Send a test alert through a custom import',
    description:
      'Runs the import workflow once with a sample payload (or the one given) as the webhook body. This runs the real workflow and writes a real alert. It does not go through the webhook URL.',
  } as const;
  static schemas = {
    request: {
      params: importIdParamsSchema,
      body: testImportRequestSchema,
    },
    response: {
      200: {
        body: () => testImportResponseSchema,
        description: 'Returns the workflow execution that was started and the payload it got.',
      },
      404: {
        body: () => errorResponseSchema,
        description: 'Indicates no import with the given ID exists.',
      },
    },
  };

  protected readonly routeName = 'test import';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<ImportIdParams, unknown, TestImportRequest, 'post'>,
    @inject(ImportSetupService)
    private readonly importSetupService: ImportSetupService
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.importSetupService.testImport({
      id: this.request.params.id,
      payload: this.request.body?.payload,
    });
    return this.ctx.response.ok({ body: result });
  }
}
