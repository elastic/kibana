/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { errorResponseSchema } from '@kbn/alerting-v2-schemas';
import { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { MatcherSuggestionsService } from '../../lib/services/matcher_suggestions_service/matcher_suggestions_service';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

const matcherDataFieldsQuerySchema = z.object({
  matcher: z.string().min(1).max(2048).optional(),
});

const matcherDataFieldsResponseSchema = z
  .array(z.string())
  .describe('The list of available matcher data field names');

@injectable()
export class MatcherDataFieldsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_ACTION_POLICY_API_PATH}/suggestions/data_fields`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.read],
    },
  };
  static routeOptions = {
    summary: 'Get matcher data fields suggestions',
    description: 'Get suggestions for matcher data fields.',
  } as const;
  static schemas = {
    request: {
      query: matcherDataFieldsQuerySchema,
    },
    response: {
      200: {
        body: () => matcherDataFieldsResponseSchema,
        description: 'Returns the available matcher data field names.',
      },
      400: {
        body: () => errorResponseSchema,
        description: 'Indicates invalid query parameters.',
      },
    },
  };

  protected readonly routeName = 'matcher data fields suggestions';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      unknown,
      z.infer<typeof matcherDataFieldsQuerySchema>,
      unknown
    >,
    @inject(MatcherSuggestionsService)
    private readonly suggestionsService: MatcherSuggestionsService
  ) {
    super(ctx);
  }

  protected async execute() {
    const { matcher } = this.request.query ?? {};
    const fields = await this.suggestionsService.getDataFieldNames(matcher);
    return this.ctx.response.ok({ body: fields });
  }
}
