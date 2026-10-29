/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  actionPolicyTestPreviewBodySchema,
  actionPolicyTestPreviewResponseSchema,
  errorResponseSchema,
  type ActionPolicyTestPreviewBody,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { ActionPolicyTestService } from '../../lib/action_policy_test/action_policy_test_service';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_INTERNAL_ACTION_POLICY_TEST_PREVIEW_API_PATH } from '../constants';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import {
  ACTION_POLICY_LICENSE_FORBIDDEN_DESCRIPTION,
  ACTION_POLICY_NOT_FOUND_DESCRIPTION,
} from './action_policy_route_descriptions';
import { actionPolicyIdParamsSchema } from './route_schemas';

@injectable()
export class PreviewActionPolicyTestRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = ALERTING_V2_INTERNAL_ACTION_POLICY_TEST_PREVIEW_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Preview a test notification of an action policy',
    description:
      'Builds a test notification of an action policy from synthetic alerts and placeholder rules, and returns its payload and the destinations it can be sent to. No alerts, rules or alert actions are read.',
  } as const;
  static schemas = {
    request: {
      params: actionPolicyIdParamsSchema,
      body: actionPolicyTestPreviewBodySchema,
    },
    response: {
      200: {
        body: () => actionPolicyTestPreviewResponseSchema,
        description: 'Returns the synthetic action groups, or why none can be built.',
      },
      400: {
        body: () => errorResponseSchema,
        description: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
      },
      403: {
        body: () => errorResponseSchema,
        description: ACTION_POLICY_LICENSE_FORBIDDEN_DESCRIPTION,
      },
      404: {
        body: () => errorResponseSchema,
        description: ACTION_POLICY_NOT_FOUND_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'preview action policy test';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof actionPolicyIdParamsSchema>,
      unknown,
      ActionPolicyTestPreviewBody
    >,
    @inject(ActionPolicyTestService)
    private readonly actionPolicyTestService: ActionPolicyTestService
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.actionPolicyTestService.preview({
      policyId: this.request.params.id,
      seed: this.request.body?.seed,
    });
    return this.ctx.response.ok({ body: result });
  }
}
