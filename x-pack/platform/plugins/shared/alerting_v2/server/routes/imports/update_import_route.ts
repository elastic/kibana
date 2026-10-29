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
  updateImportDataSchema,
  type ImportIdParams,
  type UpdateImportData,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { ImportSetupService } from '../../lib/import_setup';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_INTERNAL_IMPORT_API_PATH } from '../constants';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';

@injectable()
export class UpdateImportRoute extends BaseAlertingRoute {
  static method = 'patch' as const;
  static path = `${ALERTING_V2_INTERNAL_IMPORT_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.importConfigs.write],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Update a custom import',
    description:
      'Updates fields of a custom import. Fields left out are kept. Changing `enabled` also enables or disables the import workflow. The generated workflow is otherwise not touched.',
  } as const;
  static schemas = {
    request: {
      params: importIdParamsSchema,
      body: updateImportDataSchema,
    },
    response: {
      200: {
        body: () => importResponseSchema,
        description: 'Returns the updated import.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
      404: {
        body: () => errorResponseSchema,
        description: 'Indicates no import with the given ID exists.',
      },
    },
  };

  protected readonly routeName = 'update import';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<ImportIdParams, unknown, UpdateImportData, 'patch'>,
    @inject(ImportSetupService)
    private readonly importSetupService: ImportSetupService
  ) {
    super(ctx);
  }

  protected async execute() {
    const updated = await this.importSetupService.updateImport({
      id: this.request.params.id,
      data: this.request.body,
    });
    return this.ctx.response.ok({ body: updated });
  }
}
