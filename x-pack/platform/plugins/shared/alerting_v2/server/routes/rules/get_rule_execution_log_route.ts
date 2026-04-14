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
import { z } from '@kbn/zod/v4';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import {
  ExecutionLogServiceToken,
  type ExecutionLogServiceContract,
} from '../../lib/services/execution_log_service';
import { ruleIdParamsSchema } from './route_schemas';

const executionLogQuerySchema = z.object({
  date_start: z.string().describe('Start of the time range (ISO 8601).'),
  date_end: z.string().describe('End of the time range (ISO 8601).'),
  sort: z.enum(['asc', 'desc']).default('desc').describe('Sort order by timestamp.'),
  status_filter: z.enum(['success', 'failure']).optional().describe('Filter by execution outcome.'),
  search: z.string().optional().describe('Full-text search on execution messages.'),
});

const executionLogEntrySchema = z.object({
  timestamp: z.string(),
  scheduled_at: z.string(),
  duration_ms: z.number(),
  outcome: z.string(),
  message: z.string(),
  active_alerts: z.number(),
});

const executionLogResponseSchema = z.array(executionLogEntrySchema);

@injectable()
export class GetRuleExecutionLogRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/{id}/_execution_log`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    summary: 'Get rule execution log',
  } as const;
  static validate = {
    request: {
      params: buildRouteValidationWithZod(ruleIdParamsSchema),
      query: buildRouteValidationWithZod(executionLogQuerySchema),
    },
    response: {
      200: {
        body: () => executionLogResponseSchema,
        description: 'Indicates a successful call.',
      },
    },
  };

  protected readonly routeName = 'get rule execution log';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof ruleIdParamsSchema>,
      z.infer<typeof executionLogQuerySchema>,
      unknown
    >,
    @inject(ExecutionLogServiceToken)
    private readonly executionLogService: ExecutionLogServiceContract
  ) {
    super(ctx);
  }

  protected async execute() {
    const { id } = this.request.params;
    const { date_start, date_end, sort, status_filter, search } = this.request.query;

    const entries = await this.executionLogService.getExecutionLog({
      ruleId: id,
      dateStart: date_start,
      dateEnd: date_end,
      sort,
      statusFilter: status_filter,
      search,
    });

    return this.ctx.response.ok({
      body: entries.map((entry) => ({
        timestamp: entry.timestamp,
        scheduled_at: entry.scheduledAt,
        duration_ms: entry.durationMs,
        outcome: entry.outcome,
        message: entry.message,
        active_alerts: entry.activeAlerts,
      })),
    });
  }
}
