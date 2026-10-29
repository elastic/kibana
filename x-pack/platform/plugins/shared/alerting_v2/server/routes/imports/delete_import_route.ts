/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deleteImportRequestSchema,
  errorResponseSchema,
  importIdParamsSchema,
  type DeleteImportRequest,
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
export class DeleteImportRoute extends BaseAlertingRoute {
  static method = 'delete' as const;
  static path = `${ALERTING_V2_INTERNAL_IMPORT_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.importConfigs.write],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Delete a custom import',
    description:
      'Deletes the import config record. With `deleteResources=true` the connector and the workflow it created are deleted too. This request has no body.',
  } as const;
  static schemas = {
    request: {
      params: importIdParamsSchema,
      query: deleteImportRequestSchema,
    },
    response: {
      204: {
        description: 'The import was deleted successfully.',
      },
      404: {
        body: () => errorResponseSchema,
        description: 'Indicates no import with the given ID exists.',
      },
    },
  };

  protected readonly routeName = 'delete import';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<ImportIdParams, DeleteImportRequest, unknown, 'delete'>,
    @inject(ImportSetupService)
    private readonly importSetupService: ImportSetupService
  ) {
    super(ctx);
  }

  protected async execute() {
    await this.importSetupService.deleteImport({
      id: this.request.params.id,
      deleteResources: this.request.query?.deleteResources ?? false,
    });
    return this.ctx.response.noContent();
  }
}
