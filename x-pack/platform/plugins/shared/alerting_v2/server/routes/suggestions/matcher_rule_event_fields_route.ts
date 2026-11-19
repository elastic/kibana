/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import {
  errorResponseSchema,
  ruleEventFieldsQuerySchema,
  ruleEventFieldsResponseSchema,
  type RuleEventFieldsQuery,
} from '@kbn/alerting-v2-schemas';
import { inject, injectable } from 'inversify';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { MatcherSuggestionsService } from '../../lib/services/matcher_suggestions_service/matcher_suggestions_service';
import { ALERTING_V2_INTERNAL_SUGGESTIONS_RULE_EVENT_FIELDS_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ruleEventFieldsOasExamples } from './rule_event_fields_oas_example';
import { AlertingRouteContext } from '../alerting_route_context';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';

@injectable()
export class MatcherRuleEventFieldsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = ALERTING_V2_INTERNAL_SUGGESTIONS_RULE_EVENT_FIELDS_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Get rule event fields suggestions',
    description: 'Get suggestions for rule event fields.',
    oasOperationObject: ruleEventFieldsOasExamples,
  } as const;
  static schemas = {
    request: {
      query: ruleEventFieldsQuerySchema,
    },
    response: {
      200: {
        body: () => ruleEventFieldsResponseSchema,
        description: 'Returns the available rule event field names.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'matcher rule event fields suggestions';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, RuleEventFieldsQuery, unknown>,
    @inject(MatcherSuggestionsService)
    private readonly suggestionsService: MatcherSuggestionsService
  ) {
    super(ctx);
  }

  protected async execute() {
    const { matcher } = this.request.query ?? {};
    const fields = await this.suggestionsService.getRuleEventFieldNames(matcher);
    return this.ctx.response.ok({ body: fields });
  }
}
