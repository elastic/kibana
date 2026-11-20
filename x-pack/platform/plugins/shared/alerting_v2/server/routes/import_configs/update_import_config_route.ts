/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  errorResponseSchema,
  importConfigResponseSchema,
  updateImportConfigDataSchema,
  type UpdateImportConfigData,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { ImportConfigClient } from '../../lib/import_config_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_IMPORT_CONFIG_API_PATH } from '../constants';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import {
  IMPORT_CONFIG_NOT_FOUND_DESCRIPTION,
  IMPORT_CONFIG_VERSION_CONFLICT_DESCRIPTION,
} from './import_config_route_descriptions';
import { importConfigIdParamsSchema } from './route_schemas';

@injectable()
export class UpdateImportConfigRoute extends BaseAlertingRoute {
  static method = 'patch' as const;
  static path = `${ALERTING_V2_IMPORT_CONFIG_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
    },
  };
  static routeOptions = {
    access: 'public' as const,
    availability: { stability: 'experimental' as const },
    summary: 'Partially update an import',
    description:
      'Updates only the fields you send and keeps the rest. Send `null` to clear an optional field. The connector of an import cannot be changed.',
  } as const;
  static schemas = {
    request: {
      body: updateImportConfigDataSchema,
      params: importConfigIdParamsSchema,
    },
    response: {
      200: {
        body: () => importConfigResponseSchema,
        description: 'Returns the updated import.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
      404: {
        body: () => errorResponseSchema,
        description: IMPORT_CONFIG_NOT_FOUND_DESCRIPTION,
      },
      409: {
        body: () => errorResponseSchema,
        description: IMPORT_CONFIG_VERSION_CONFLICT_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'update import config';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof importConfigIdParamsSchema>,
      unknown,
      UpdateImportConfigData
    >,
    @inject(ImportConfigClient) private readonly importConfigClient: ImportConfigClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const updated = await this.importConfigClient.updateImportConfig({
      id: this.request.params.id,
      data: this.request.body,
    });
    return this.ctx.response.ok({ body: updated });
  }
}
