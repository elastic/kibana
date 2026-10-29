/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAnyImportDataSchema,
  createImportResponseSchema,
  errorResponseSchema,
  type CreateAnyImportData,
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
export class CreateImportRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = ALERTING_V2_INTERNAL_IMPORT_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.importConfigs.write],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Create an import',
    description:
      'Creates a custom import (default): an inbound webhook connector, a workflow that turns its payloads into alerts, and the config record. The webhook URL and ingest token are returned once, the token cannot be read again. With `kind: "managed"` it creates the config record on an existing vendor connector instead and returns only the webhook URL.',
  } as const;
  static schemas = {
    request: {
      body: createAnyImportDataSchema,
    },
    response: {
      201: {
        body: () => createImportResponseSchema,
        description: 'Returns the newly created import and the credentials to send to it.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'create import';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, CreateAnyImportData>,
    @inject(ImportSetupService)
    private readonly importSetupService: ImportSetupService
  ) {
    super(ctx);
  }

  protected async execute() {
    const { body } = this.request;
    const created =
      body.kind === 'managed'
        ? await this.importSetupService.createManagedImport(body)
        : await this.importSetupService.createImport(body);

    return this.ctx.response.created({ body: created });
  }
}
