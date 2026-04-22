/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core-http-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import { z } from '@kbn/zod/v4';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { RuleDoctorWorkflowServiceToken } from '../../workflows/tokens';
import type { RuleDoctorWorkflowService } from '../../workflows/rule_doctor_workflow';
import { EsServiceInternalToken } from '../../lib/services/es_service/tokens';
import { enrichExecutionsWithDataViewNames } from './enrich_executions';

const responseSchema = z.object({
  executions: z.array(
    z.object({
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
    })
  ),
});

@injectable()
export class ListRuleDoctorExecutionsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = '/internal/alerting/v2/rule_doctor/executions';
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'List Rule Doctor executions',
  };
  static validate = {
    request: {},
    response: {
      200: {
        body: () => responseSchema,
        description: 'Latest Rule Doctor execution summary.',
      },
    },
  };

  protected readonly routeName = 'list rule doctor executions';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(RuleDoctorWorkflowServiceToken)
    private readonly ruleDoctorService: RuleDoctorWorkflowService,
    @inject(EsServiceInternalToken)
    private readonly esClient: ElasticsearchClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const executions = await this.ruleDoctorService.listExecutions({});
    await enrichExecutionsWithDataViewNames(executions, this.esClient);

    return this.ctx.response.ok({
      body: { executions },
    });
  }
}
