/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createImportConfigDataSchema,
  errorResponseSchema,
  importConfigResponseSchema,
  type CreateImportConfigData,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { ImportConfigClient } from '../../lib/import_config_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_IMPORT_CONFIG_API_PATH } from '../constants';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { IMPORT_CONFIG_ALREADY_EXISTS_DESCRIPTION } from './import_config_route_descriptions';

@injectable()
export class CreateImportConfigRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = ALERTING_V2_IMPORT_CONFIG_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
    },
  };
  static routeOptions = {
    access: 'public' as const,
    availability: { stability: 'experimental' as const },
    summary: 'Create an import',
    description:
      'Creates an import. You can supply your own `id`; if you omit it, Kibana generates one. If an import with that `id` already exists, the request fails with HTTP 409 and the existing import is not changed.',
  } as const;
  static schemas = {
    request: {
      body: createImportConfigDataSchema,
    },
    response: {
      201: {
        body: () => importConfigResponseSchema,
        description: 'Returns the newly created import.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
      409: {
        body: () => errorResponseSchema,
        description: IMPORT_CONFIG_ALREADY_EXISTS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'create import config';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, CreateImportConfigData>,
    @inject(ImportConfigClient) private readonly importConfigClient: ImportConfigClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const created = await this.importConfigClient.createImportConfig({ data: this.request.body });
    return this.ctx.response.created({ body: created });
  }
}
