/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  errorResponseSchema,
  importCredentialsResponseSchema,
  importIdParamsSchema,
  type ImportIdParams,
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
export class RotateImportTokenRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_INTERNAL_IMPORT_API_PATH}/{id}/_rotate_token`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.importConfigs.write],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Rotate the ingest token of a custom import',
    description:
      'Mints a new ingest token. The previous token stops working immediately. The new token is returned once and cannot be read again.',
  } as const;
  static schemas = {
    request: {
      params: importIdParamsSchema,
    },
    response: {
      200: {
        body: () => importCredentialsResponseSchema,
        description: 'Returns the webhook URL and the new ingest token.',
      },
      404: {
        body: () => errorResponseSchema,
        description: 'Indicates no import with the given ID exists.',
      },
    },
  };

  protected readonly routeName = 'rotate import token';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<ImportIdParams, unknown, unknown, 'post'>,
    @inject(ImportSetupService)
    private readonly importSetupService: ImportSetupService
  ) {
    super(ctx);
  }

  protected async execute() {
    const credentials = await this.importSetupService.rotateToken({ id: this.request.params.id });
    return this.ctx.response.ok({ body: credentials });
  }
}
