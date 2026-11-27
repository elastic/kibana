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
import { ExternalSourceClient } from '../../lib/external_source_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_INTERNAL_EXTERNAL_SOURCE_API_PATH } from '../constants';
import { EXTERNAL_SOURCE_NOT_FOUND_DESCRIPTION } from './external_source_route_descriptions';
import { externalSourceIdParamsSchema } from './route_schemas';

@injectable()
export class DeleteExternalSourceRoute extends BaseAlertingRoute {
  static method = 'delete' as const;
  static path = `${ALERTING_V2_INTERNAL_EXTERNAL_SOURCE_API_PATH}/{id}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Delete an import',
    description:
      'Deletes the import whose ID you include in the URL path. This request has no body.',
  } as const;
  static schemas = {
    request: {
      params: externalSourceIdParamsSchema,
    },
    response: {
      204: {
        description: 'The import was deleted successfully.',
      },
      404: {
        body: () => errorResponseSchema,
        description: EXTERNAL_SOURCE_NOT_FOUND_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'delete external source';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof externalSourceIdParamsSchema>,
      unknown,
      unknown,
      'delete'
    >,
    @inject(ExternalSourceClient) private readonly externalSourceClient: ExternalSourceClient
  ) {
    super(ctx);
  }

  protected async execute() {
    await this.externalSourceClient.deleteExternalSource({ id: this.request.params.id });
    return this.ctx.response.noContent();
  }
}
