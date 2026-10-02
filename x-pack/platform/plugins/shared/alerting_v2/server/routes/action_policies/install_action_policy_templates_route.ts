/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  errorResponseSchema,
  installActionPolicyTemplatesResponseSchema,
} from '@kbn/alerting-v2-schemas';
import type { RouteSecurity } from '@kbn/core-http-server';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import { inject, injectable } from 'inversify';
import { ActionPolicyTemplatesClient } from '../../lib/action_policy_templates/action_policy_templates_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';
import { ALERTING_V2_INTERNAL_ACTION_POLICY_INSTALL_TEMPLATES_API_PATH } from '../constants';
import { ACTION_POLICY_LICENSE_FORBIDDEN_DESCRIPTION } from './action_policy_route_descriptions';

@injectable()
export class InstallActionPolicyTemplatesRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = ALERTING_V2_INTERNAL_ACTION_POLICY_INSTALL_TEMPLATES_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [
        ALERTING_V2_API_PRIVILEGES.actionPolicies.write,
        ALERTING_V2_API_PRIVILEGES.rules.read,
        ...WorkflowsManagementOperationPrivileges.create,
        ...WorkflowsManagementOperationPrivileges.read,
      ],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Install action policy templates',
    description:
      'Creates, in the space of the request, a placeholder workflow that logs to the console and a set of disabled template action policies that dispatch to it. Resources that already exist are skipped. Requires an active Enterprise license.',
  } as const;
  static schemas = {
    response: {
      200: {
        body: () => installActionPolicyTemplatesResponseSchema,
        description:
          'Returns the workflow and the template action policies, each marked as created or skipped.',
      },
      403: {
        body: () => errorResponseSchema,
        description: ACTION_POLICY_LICENSE_FORBIDDEN_DESCRIPTION,
      },
    },
  };

  protected readonly routeName = 'install action policy templates';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(ActionPolicyTemplatesClient)
    private readonly actionPolicyTemplatesClient: ActionPolicyTemplatesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const result = await this.actionPolicyTemplatesClient.installTemplates();
    return this.ctx.response.ok({ body: result });
  }
}
