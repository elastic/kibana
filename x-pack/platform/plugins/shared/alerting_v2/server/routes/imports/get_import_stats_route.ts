/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { importStatsResponseSchema } from '@kbn/alerting-v2-schemas';
import type { RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { ImportStatsClient } from '../../lib/import_stats';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_INTERNAL_IMPORT_STATS_API_PATH } from '../constants';

@injectable()
export class GetImportStatsRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = ALERTING_V2_INTERNAL_IMPORT_STATS_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [
        ALERTING_V2_API_PRIVILEGES.importConfigs.read,
        ALERTING_V2_API_PRIVILEGES.alerts.read,
      ],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Get stats for all custom imports',
    description:
      'Returns, for every import, its status, how many alert series it created, when it last created an alert and how its workflow last ran. A POST because it reads a lot, it changes nothing.',
  } as const;
  static schemas = {
    response: {
      200: {
        body: () => importStatsResponseSchema,
        description: 'Returns the stats of every import.',
      },
    },
  };

  protected readonly routeName = 'get import stats';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(ImportStatsClient) private readonly importStatsClient: ImportStatsClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const stats = await this.importStatsClient.getImportStats();
    return this.ctx.response.ok({ body: stats });
  }
}
