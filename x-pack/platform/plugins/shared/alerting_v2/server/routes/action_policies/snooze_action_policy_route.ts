/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  actionPolicyResponseSchema,
  errorResponseSchema,
  ID_MAX_LENGTH,
  snoozeActionPolicyBodySchema,
  type SnoozeActionPolicyBody,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { ActionPolicyClient } from '../../lib/action_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { snoozeActionPolicyOasExamples } from './snooze_action_policy_oas_example';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';
import {
  ACTION_POLICY_NOT_FOUND_DESCRIPTION,
  ACTION_POLICY_VERSION_CONFLICT_DESCRIPTION,
} from './action_policy_route_descriptions';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';

const snoozeActionPolicyParamsSchema = z.object({
  id: z.string().min(1).max(ID_MAX_LENGTH).describe('The action policy identifier.'),
});

@injectable()
export class SnoozeActionPolicyRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = `${ALERTING_V2_ACTION_POLICY_API_PATH}/{id}/_snooze`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.write],
    },
  };
  static routeOptions = {
    summary: 'Snooze an action policy',
    description: 'Snooze an action policy until a specified time.',
    oasOperationObject: snoozeActionPolicyOasExamples,
  } as const;
  static schemas = {
    request: {
      params: snoozeActionPolicyParamsSchema,
      body: snoozeActionPolicyBodySchema,
    },
    response: {
      200: {
        body: () => actionPolicyResponseSchema,
        description: 'Returns the snoozed action policy.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
      404: {
        body: () => errorResponseSchema,
        description: ACTION_POLICY_NOT_FOUND_DESCRIPTION,
      },
      409: {
        body: () => errorResponseSchema,
        description: ACTION_POLICY_VERSION_CONFLICT_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'snooze action policy';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof snoozeActionPolicyParamsSchema>,
      unknown,
      SnoozeActionPolicyBody
    >,
    @inject(ActionPolicyClient)
    private readonly actionPolicyClient: ActionPolicyClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.actionPolicyClient.snoozeActionPolicy({
      id: this.request.params.id,
      snoozedUntil: this.request.body.snoozedUntil,
    });

    return this.ctx.response.ok({ body: result });
  }
}
