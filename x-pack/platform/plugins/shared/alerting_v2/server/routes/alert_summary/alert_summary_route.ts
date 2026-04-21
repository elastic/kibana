/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { CoreStart, Request } from '@kbn/core-di-server';
import { inject, injectable } from 'inversify';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  alertSummaryRequestSchema,
  alertSummaryResponseSchema,
  type AlertSummaryRequest,
  type AlertSummaryResponse,
} from '@kbn/alerting-v2-schemas';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';

import { buildAlertSummaryQuery } from '../../lib/alert_summary/build_alert_summary_query';
import { toAlertSummaryResponse } from '../../lib/alert_summary/to_alert_summary_response';
import type { QueryServiceContract } from '../../lib/services/query_service/query_service';
import { QueryServiceScopedToken } from '../../lib/services/query_service/tokens';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_ALERT_SUMMARY_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

const EMPTY_RESPONSE: AlertSummaryResponse = {
  activeEventCount: 0,
  recoveredEventCount: 0,
  activeSeries: [],
  recoveredSeries: [],
};

@injectable()
export class AlertSummaryRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = ALERTING_V2_ALERT_SUMMARY_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.read],
    },
  };
  static routeOptions = {
    access: 'internal',
    summary: 'Get v2 alert summary',
  } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(alertSummaryRequestSchema),
    },
    response: {
      200: {
        body: () => alertSummaryResponseSchema,
        description: 'Indicates a successful call.',
      },
      400: {
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  protected readonly routeName = 'get alert summary';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, AlertSummaryRequest>,
    @inject(CoreStart('http')) private readonly http: HttpServiceStart,
    @inject(QueryServiceScopedToken) private readonly queryService: QueryServiceContract
  ) {
    super(ctx);
  }

  protected async execute() {
    const { gte, lte, fixed_interval: fixedInterval, ruleIds } = this.request.body;

    if (ruleIds.length === 0) {
      return this.ctx.response.ok({ body: EMPTY_RESPONSE });
    }

    const requestBasePath = this.http.basePath.get(this.request);
    const space = getSpaceIdFromPath(requestBasePath, this.http.basePath.serverBasePath);
    const spaceId = space?.spaceId || 'default';

    const { query, params } = buildAlertSummaryQuery({
      gte,
      lte,
      fixedInterval,
      ruleIds,
      spaceId,
    });

    const esqlResponse = await this.queryService.executeQuery({
      query,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      params,
    });

    return this.ctx.response.ok({ body: toAlertSummaryResponse(esqlResponse) });
  }
}
