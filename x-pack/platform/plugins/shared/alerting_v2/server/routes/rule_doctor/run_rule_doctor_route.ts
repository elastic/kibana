/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { inject, injectable } from 'inversify';
import { CoreStart, Request } from '@kbn/core-di-server';
import { Logger as DILogger } from '@kbn/core-di';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { ALERTING_V2_RULE_DOCTOR_RUN_API_PATH } from '@kbn/alerting-v2-constants';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { SpaceContext } from '../rule_doctor_insights/space_context';
import { WorkflowsManagementApiToken } from '../../lib/dispatcher/steps/dispatch_step_tokens';
import { ensureRuleDoctorWorkflow } from '../../workflows/load_workflows';

const runRuleDoctorBodySchema = z.object({
  type: z
    .enum(['deduplication'])
    .describe('The type of Rule Doctor analysis to run'),
});

@injectable()
export class RunRuleDoctorRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = ALERTING_V2_RULE_DOCTOR_RUN_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.ruleDoctor.write],
    },
  };
  static routeOptions = {
    summary: 'Run a Rule Doctor analysis',
  } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(runRuleDoctorBodySchema),
    },
  };

  protected readonly routeName = 'run rule doctor';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, z.infer<typeof runRuleDoctorBodySchema>>,
    @inject(WorkflowsManagementApiToken)
    private readonly workflowsManagement: WorkflowsServerPluginSetup['management'],
    @inject(SpaceContext) private readonly spaceContext: SpaceContext,
    @inject(CoreStart('uiSettings')) private readonly uiSettings: UiSettingsServiceStart,
    @inject(CoreStart('savedObjects')) private readonly savedObjects: SavedObjectsServiceStart,
    @inject(DILogger) private readonly logger: Logger
  ) {
    super(ctx);
  }

  protected async execute() {
    const { type } = this.request.body;
    const executionId = uuidv4();
    const spaceId = this.spaceContext.spaceId;
    const connectorId = await this.getDefaultConnectorId();

    const workflow = await this.ensureWorkflow(type, spaceId);

    await this.workflowsManagement.scheduleWorkflow(
      workflow,
      spaceId,
      { space_id: spaceId, execution_id: executionId, connector_id: connectorId },
      this.request,
      'rule_doctor'
    );

    return this.ctx.response.accepted({
      body: { execution_id: executionId, type },
    });
  }

  private async getDefaultConnectorId(): Promise<string> {
    const soClient = this.savedObjects.getScopedClient(this.request);
    const client = this.uiSettings.asScopedToClient(soClient);
    return client.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
  }

  private async ensureWorkflow(type: string, spaceId: string) {
    switch (type) {
      case 'deduplication':
        return ensureRuleDoctorWorkflow(
          this.workflowsManagement,
          spaceId,
          this.request,
          this.logger
        );
      default:
        throw new Error(`Unknown rule doctor analysis type: ${type}`);
    }
  }
}
