/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { inject, injectable } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import { z } from '@kbn/zod/v4';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import type { AlertingServerStartDependencies } from '../../types';
import {
  RULE_DOCTOR_TASK_TYPE,
  getRuleDoctorTaskId,
} from '../../lib/tasks/rule_doctor/task_definition';
import {
  RULE_DOCTOR_COVERAGE_TASK_TYPE,
  getRuleDoctorCoverageTaskId,
} from '../../lib/tasks/rule_doctor_coverage/task_definition';
import { RULE_DOCTOR_COVERAGE_STATE_INDEX } from '../../resources/indices/rule_doctor_coverage_state';
import { EsServiceInternalToken } from '../../lib/services/es_service/tokens';

const responseSchema = z.object({
  scheduled: z.boolean(),
});

@injectable()
export class RunRuleDoctorRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = '/internal/alerting/v2/rule_doctor/_run';
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Run Rule Doctor analysis',
  };
  static validate = {
    request: {},
    response: {
      200: {
        body: () => responseSchema,
        description: 'Rule Doctor analysis scheduled successfully.',
      },
    },
  };

  protected readonly routeName = 'run rule doctor';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(PluginStart<AlertingServerStartDependencies['taskManager']>('taskManager'))
    private readonly taskManager: AlertingServerStartDependencies['taskManager'],
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart,
    @inject(EsServiceInternalToken)
    private readonly esClient: ElasticsearchClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const spaceId = this.spaces.spacesService.getSpaceId(this.request);

    const mainTaskId = getRuleDoctorTaskId(spaceId);
    await this.taskManager.ensureScheduled(
      {
        id: mainTaskId,
        taskType: RULE_DOCTOR_TASK_TYPE,
        schedule: { interval: '1d' },
        params: { spaceId },
        state: {},
        scope: ['alerting'],
      },
      { request: this.request }
    );

    const coverageTaskId = getRuleDoctorCoverageTaskId(spaceId);
    await this.taskManager.ensureScheduled(
      {
        id: coverageTaskId,
        taskType: RULE_DOCTOR_COVERAGE_TASK_TYPE,
        schedule: { interval: '15m' },
        params: { spaceId },
        state: {},
        scope: ['alerting'],
      },
      { request: this.request }
    );

    await this.esClient.index({
      index: RULE_DOCTOR_COVERAGE_STATE_INDEX,
      document: {
        '@timestamp': new Date().toISOString(),
        space_id: spaceId,
        status: 'run_now',
        data_view_name: '',
        data_view_pattern: '',
        data_view_id: '',
        execution_id: '',
        lookback_hours: 1,
      },
      refresh: true,
    });

    const runSoonSafe = async (taskId: string) => {
      try {
        await this.taskManager.runSoon(taskId);
      } catch {
        // Task may already be running
      }
    };

    await Promise.all([runSoonSafe(mainTaskId), runSoonSafe(coverageTaskId)]);

    return this.ctx.response.ok({
      body: { scheduled: true },
    });
  }
}
