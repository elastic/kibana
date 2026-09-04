/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import {
  bulkCreateSeriesAlertActionBodySchema,
  bulkResponseSchema,
  errorResponseSchema,
  type BulkCreateSeriesAlertActionBody,
} from '@kbn/alerting-v2-schemas';
import { AlertActionsClient } from '../../../lib/alert_actions_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../../lib/security/privileges';
import { ALERTING_V2_SERIES_API_PATH } from '../../constants';
import { AlertingRouteContext } from '../../alerting_route_context';
import { BaseAlertingRoute } from '../../base_alerting_route';
import { bulkCreateSeriesActionOasExamples } from './bulk_create_series_action_oas_example';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../../route_descriptions';

@injectable()
export class BulkCreateSeriesActionRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_SERIES_API_PATH}/_bulk_action`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
    },
  };
  static routeOptions = {
    summary: 'Bulk create alert episode series actions',
    description: 'Create actions for multiple alert episode series in a single request.',
    oasOperationObject: bulkCreateSeriesActionOasExamples,
  } as const;
  static schemas = {
    request: {
      body: bulkCreateSeriesAlertActionBodySchema,
    },
    response: {
      200: {
        body: () => bulkResponseSchema,
        description:
          'Returns the number of created actions and per-item errors for actions that were not created.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'bulk create series action';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, BulkCreateSeriesAlertActionBody>,
    @inject(AlertActionsClient) private readonly alertActionsClient: AlertActionsClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.alertActionsClient.createBulkSeriesActions(this.request.body);

    return this.ctx.response.ok({ body: result });
  }
}
