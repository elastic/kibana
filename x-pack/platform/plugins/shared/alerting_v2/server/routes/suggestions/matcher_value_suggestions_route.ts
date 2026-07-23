/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { errorResponseSchema } from '@kbn/alerting-v2-schemas';
import type { KibanaRequest } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_MATCHER_VALUE_SUGGESTIONS_API_PATH } from '../constants';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { MatcherSuggestionsService } from '../../lib/services/matcher_suggestions_service/matcher_suggestions_service';

const suggestionsBodySchema = z
  .object({
    field: z.string().min(1).max(256).describe('The field to suggest values for.'),
    query: z.string().max(1024).describe('Optional search query for filtering suggestions.'),
  })
  .strict();

type SuggestionsBody = z.infer<typeof suggestionsBodySchema>;

@injectable()
export class MatcherValueSuggestionsRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = ALERTING_V2_MATCHER_VALUE_SUGGESTIONS_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [
        ALERTING_V2_API_PRIVILEGES.rules.read,
        ALERTING_V2_API_PRIVILEGES.alerts.read,
      ],
    },
  };
  static routeOptions = {
    summary: 'Get matcher value suggestions',
    description:
      'Get suggestions for action policy matcher values based on an optional search query.',
  } as const;
  static schemas = {
    request: {
      body: suggestionsBodySchema,
    },
    response: {
      400: {
        body: () => errorResponseSchema,
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  protected readonly routeName = 'matcher value suggestions';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, SuggestionsBody>,
    @inject(MatcherSuggestionsService)
    private readonly suggestionsService: MatcherSuggestionsService
  ) {
    super(ctx);
  }

  protected async execute() {
    const { field, query } = this.request.body;
    const values = await this.suggestionsService.getSuggestions(field, query);
    return this.ctx.response.ok({ body: values });
  }
}
