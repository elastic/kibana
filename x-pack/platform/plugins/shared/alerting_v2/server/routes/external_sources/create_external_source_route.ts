/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createExternalSourceDataSchema,
  errorResponseSchema,
  externalSourceResponseSchema,
  type CreateExternalSourceData,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { ExternalSourceClient } from '../../lib/external_source_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_INTERNAL_EXTERNAL_SOURCE_API_PATH } from '../constants';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { EXTERNAL_SOURCE_ALREADY_EXISTS_DESCRIPTION } from './external_source_route_descriptions';

@injectable()
export class CreateExternalSourceRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = ALERTING_V2_INTERNAL_EXTERNAL_SOURCE_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Create an import',
    description:
      'Creates an import. You can supply your own `id`; if you omit it, Kibana generates one. If an import with that `id` already exists, the request fails with HTTP 409 and the existing import is not changed. To create or replace an import at a specific ID, use PUT /internal/alerting/v2/external_sources/{id}.',
  } as const;
  static schemas = {
    request: {
      body: createExternalSourceDataSchema,
    },
    response: {
      201: {
        body: () => externalSourceResponseSchema,
        description: 'Returns the newly created import.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
      409: {
        body: () => errorResponseSchema,
        description: EXTERNAL_SOURCE_ALREADY_EXISTS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'create external source';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, CreateExternalSourceData>,
    @inject(ExternalSourceClient) private readonly externalSourceClient: ExternalSourceClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const created = await this.externalSourceClient.createExternalSource({
      data: this.request.body,
    });
    return this.ctx.response.created({ body: created });
  }
}
