/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errorResponseSchema } from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { ImportConfigClient } from '../../lib/import_config_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_IMPORT_CONFIG_API_PATH } from '../constants';
import { IMPORT_CONFIG_NOT_FOUND_DESCRIPTION } from './import_config_route_descriptions';
import { importConfigIdParamsSchema } from './route_schemas';

@injectable()
export class DeleteImportConfigRoute extends BaseAlertingRoute {
  static method = 'delete' as const;
  static path = `${ALERTING_V2_IMPORT_CONFIG_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
    },
  };
  static routeOptions = {
    access: 'public' as const,
    availability: { stability: 'experimental' as const },
    summary: 'Delete an import',
    description:
      'Deletes the import whose ID you include in the URL path. This request has no body.',
  } as const;
  static schemas = {
    request: {
      params: importConfigIdParamsSchema,
    },
    response: {
      204: {
        description: 'The import was deleted successfully.',
      },
      404: {
        body: () => errorResponseSchema,
        description: IMPORT_CONFIG_NOT_FOUND_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'delete import config';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof importConfigIdParamsSchema>,
      unknown,
      unknown,
      'delete'
    >,
    @inject(ImportConfigClient) private readonly importConfigClient: ImportConfigClient
  ) {
    super(ctx);
  }

  protected async execute() {
    await this.importConfigClient.deleteImportConfig({ id: this.request.params.id });
    return this.ctx.response.noContent();
  }
}
