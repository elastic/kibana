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

const executionBreakdownQuerySchema = z.object({
  date_start: z.string().describe('Start of the time range (ISO 8601).'),
  date_end: z.string().describe('End of the time range (ISO 8601).'),
  bucket_interval: z
    .string()
    .describe('Bucket interval for time grouping (e.g. "1 hour", "30 minutes", "1 day").'),
});

const executionBreakdownResponseSchema = z.array(
  z.object({
    bucket: z.string(),
    succeeded: z.number(),
    failed: z.number(),
  })
);

@injectable()
export class GetRuleExecutionBreakdownRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}/{id}/_execution_breakdown`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    summary: 'Get rule execution breakdown over time',
  } as const;
  static validate = {
    request: {
      params: buildRouteValidationWithZod(ruleIdParamsSchema),
      query: buildRouteValidationWithZod(executionBreakdownQuerySchema),
    },
    response: {
      200: {
        body: () => executionBreakdownResponseSchema,
        description: 'Indicates a successful call.',
      },
    },
  };

  protected readonly routeName = 'get rule execution breakdown';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof ruleIdParamsSchema>,
      z.infer<typeof executionBreakdownQuerySchema>,
      unknown
    >,
    @inject(ExecutionLogServiceToken)
    private readonly executionLogService: ExecutionLogServiceContract
  ) {
    super(ctx);
  }

  protected async execute() {
    const { id } = this.request.params;
    const { date_start, date_end, bucket_interval } = this.request.query;

    const buckets = await this.executionLogService.getExecutionBreakdown({
      ruleId: id,
      dateStart: date_start,
      dateEnd: date_end,
      bucketInterval: bucket_interval,
    });

    return this.ctx.response.ok({ body: buckets });
  }
}
