/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core-http-server';
import { z } from '@kbn/zod/v4';
import { injectable, inject } from 'inversify';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';

const LIST_EXECUTION_HISTORY_API_PATH = '/internal/alerting/v2/action_policies/execution_history';

const listExecutionHistoryResponseSchema = z.object({
  items: z.array(z.unknown()),
  cursor: z.string().nullable(),
  has_more: z.boolean(),
});

@injectable()
export class ListExecutionHistoryRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = LIST_EXECUTION_HISTORY_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.read],
    },
  };
  static routeOptions = {
    access: 'internal',
    summary: 'List action policy execution history',
    description:
      'Get a paginated list of dispatcher summary events for action policies in the current space.',
  } as const;
  static validate = {
    request: {},
    response: {
      200: {
        body: () => listExecutionHistoryResponseSchema,
        description: 'Indicates a successful call.',
      },
    },
  };

  protected readonly routeName = 'list action policy execution history';

  constructor(@inject(AlertingRouteContext) ctx: AlertingRouteContext) {
    super(ctx);
  }

  protected async execute() {
    return this.ctx.response.ok({
      body: {
        items: [],
        cursor: null,
        has_more: false,
      },
    });
  }
}

export { listExecutionHistoryResponseSchema };
