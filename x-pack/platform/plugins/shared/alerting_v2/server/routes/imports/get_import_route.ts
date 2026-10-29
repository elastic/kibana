/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  errorResponseSchema,
  importIdParamsSchema,
  importResponseSchema,
  type ImportIdParams,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { ImportConfigClient } from '../../lib/import_config_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_INTERNAL_IMPORT_API_PATH } from '../constants';

@injectable()
export class GetImportRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_INTERNAL_IMPORT_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.importConfigs.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Get a custom import',
    description: 'Get a custom import by identifier.',
  } as const;
  static schemas = {
    request: {
      params: importIdParamsSchema,
    },
    response: {
      200: {
        body: () => importResponseSchema,
        description: 'Returns the requested import.',
      },
      404: {
        body: () => errorResponseSchema,
        description: 'Indicates no import with the given ID exists.',
      },
    },
  };

  protected readonly routeName = 'get import';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<ImportIdParams, unknown, unknown>,
    @inject(ImportConfigClient)
    private readonly importConfigClient: ImportConfigClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const found = await this.importConfigClient.getImportConfig({ id: this.request.params.id });
    return this.ctx.response.ok({ body: found });
  }
}
