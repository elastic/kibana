/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  actionPolicyTestSendBodySchema,
  actionPolicyTestSendResponseSchema,
  errorResponseSchema,
  type ActionPolicyTestSendBody,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { ActionPolicyTestService } from '../../lib/action_policy_test/action_policy_test_service';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_INTERNAL_ACTION_POLICY_TEST_API_PATH } from '../constants';
import {
  ACTION_POLICY_LICENSE_FORBIDDEN_DESCRIPTION,
  ACTION_POLICY_NOT_FOUND_DESCRIPTION,
} from './action_policy_route_descriptions';
import { actionPolicyIdParamsSchema } from './route_schemas';

@injectable()
export class SendActionPolicyTestRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = ALERTING_V2_INTERNAL_ACTION_POLICY_TEST_API_PATH;
  /**
   * Reading the policy is enough to test it, but the workflows run as workflow test runs of the
   * current user, which the workflows management API does not check feature privileges for. The
   * workflow `execute` privilege is therefore required here too.
   */
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [
        ALERTING_V2_API_PRIVILEGES.actionPolicies.read,
        ...WorkflowsManagementOperationPrivileges.execute,
      ],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Send a test notification of an action policy',
    description:
      'Builds a test notification of an action policy from synthetic alerts, and runs each selected destination workflow as a workflow test run of the current user. Nothing is written to the alert actions and the policy execution history is unchanged.',
  } as const;
  static schemas = {
    request: {
      params: actionPolicyIdParamsSchema,
      body: actionPolicyTestSendBodySchema,
    },
    response: {
      200: {
        body: () => actionPolicyTestSendResponseSchema,
        description:
          'Returns the workflow test run started for each destination, or why it could not start.',
      },
      400: {
        body: () => errorResponseSchema,
        description:
          'Indicates invalid parameters, or destinations that do not belong to the policy.',
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

  protected readonly routeName = 'send action policy test';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<
      z.infer<typeof actionPolicyIdParamsSchema>,
      unknown,
      ActionPolicyTestSendBody
    >,
    @inject(ActionPolicyTestService)
    private readonly actionPolicyTestService: ActionPolicyTestService
  ) {
    super(ctx);
  }

  protected async execute() {
    const { seed, destination_ids: destinationIds } = this.request.body;
    const result = await this.actionPolicyTestService.send({
      policyId: this.request.params.id,
      seed,
      destinationIds,
    });
    return this.ctx.response.ok({ body: result });
  }
}
