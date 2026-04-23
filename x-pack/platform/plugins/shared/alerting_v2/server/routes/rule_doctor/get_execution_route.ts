/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { inject, injectable } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import { z } from '@kbn/zod/v4';
import type { AlertingServerStartDependencies } from '../../types';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { buildRouteValidationWithZod } from '../route_validation';
import { RuleDoctorWorkflowServiceToken } from '../../workflows/tokens';
import type { RuleDoctorWorkflowService } from '../../workflows/rule_doctor_workflow';

const paramsSchema = z.object({
  executionId: z.string(),
});

const findingSchema = z.object({
  id: z.string(),
  type: z.string(),
  action: z.string(),
  impact: z.enum(['low', 'medium', 'high']),
  confidence: z.enum(['low', 'medium', 'high']),
  summary: z.string(),
  ruleIds: z.array(z.string()),
  details: z.record(z.string(), z.unknown()).optional(),
  current: z.record(z.string(), z.unknown()).nullable(),
  proposed: z.record(z.string(), z.unknown()).nullable(),
  diffs: z.array(
    z.object({
      field: z.string(),
      previous: z.unknown(),
      proposed: z.unknown(),
    })
  ),
  explanation: z.string(),
});

const stepProgressSchema = z.object({
  stepId: z.string(),
  status: z.string(),
  label: z.string(),
  detail: z.string().nullable(),
  error: z.string().nullable(),
});

const responseSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  insightType: z.string(),
  insightLabel: z.string(),
  status: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  durationMs: z.number().nullable(),
  dataViewName: z.string().nullable(),
  dataViewId: z.string().nullable(),
  error: z.string().nullable(),
  findings: z.array(findingSchema),
  steps: z.array(stepProgressSchema),
});

@injectable()
export class GetRuleDoctorExecutionRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = '/internal/alerting/v2/rule_doctor/executions/{executionId}';
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Get Rule Doctor execution details',
  };
  static validate = {
    request: {
      params: buildRouteValidationWithZod(paramsSchema),
    },
    response: {
      200: {
        body: () => responseSchema,
        description: 'Rule Doctor execution with findings.',
      },
    },
  };

  protected readonly routeName = 'get rule doctor execution';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<z.infer<typeof paramsSchema>>,
    @inject(RuleDoctorWorkflowServiceToken)
    private readonly ruleDoctorService: RuleDoctorWorkflowService,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart
  ) {
    super(ctx);
  }

  protected async execute() {
    const { executionId } = this.request.params;
    const spaceId = this.spaces.spacesService.getSpaceId(this.request);

    const detail = await this.ruleDoctorService.getExecution({ executionId, spaceId });

    if (!detail) {
      return this.ctx.response.notFound({
        body: { message: `Execution ${executionId} not found` },
      });
    }

    return this.ctx.response.ok({
      body: detail,
    });
  }
}
