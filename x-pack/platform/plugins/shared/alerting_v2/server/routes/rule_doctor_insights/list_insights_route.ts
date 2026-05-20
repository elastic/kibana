/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { listInsightsQuerySchema, type ListInsightsQuery } from '@kbn/alerting-v2-schemas';
import type { RuleDoctorInsightsClient } from '../../lib/rule_doctor_insights_client/rule_doctor_insights_client';
import { InsightsClientScopedToken } from '../../lib/rule_doctor_insights_client/tokens';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_DOCTOR_INSIGHTS_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { SpaceContext } from './space_context';

@injectable()
export class ListInsightsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = ALERTING_V2_RULE_DOCTOR_INSIGHTS_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.ruleDoctor.read],
    },
  };
  static routeOptions = {
    summary: 'List Rule Doctor insights',
  } as const;
  static validate = {
    request: {
      query: buildRouteValidationWithZod(listInsightsQuerySchema),
    },
  };

  protected readonly routeName = 'list insights';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, ListInsightsQuery, unknown>,
    @inject(InsightsClientScopedToken)
    private readonly insightsClient: RuleDoctorInsightsClient,
    @inject(SpaceContext) private readonly spaceContext: SpaceContext
  ) {
    super(ctx);
  }

  protected async execute() {
    const {
      page,
      perPage,
      status,
      type,
      execution_id: executionId,
      rule_ids: ruleIds,
    } = this.request.query;
    const from = (page - 1) * perPage;

    const result = await this.insightsClient.listInsights({
      spaceId: this.spaceContext.spaceId,
      from,
      size: perPage,
      status,
      type,
      executionId,
      ruleIds,
    });

    return this.ctx.response.ok({
      body: { items: result.items, total: result.total, page, perPage },
    });
  }
}
