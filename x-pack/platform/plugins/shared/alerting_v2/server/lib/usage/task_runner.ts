/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { inject, injectable } from 'inversify';
import { EsServiceInternalToken } from '../services/es_service/tokens';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import type { AlertingTaskRunner } from '../services/task_run_scope_service/create_task_runner';
import { SCHEDULE } from './constants';
import { getActionPolicyStats } from './lib/get_action_policy_stats';
import { getAlertStats } from './lib/get_alert_stats';
import { getExecutionStats } from './lib/get_execution_stats';
import { getRuleStats } from './lib/get_rule_stats';
import { emptyState, type LatestTaskStateSchema } from './task_state';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'signal'>;

@injectable()
export class TelemetryTaskRunner implements AlertingTaskRunner {
  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(EsServiceInternalToken) private readonly esClient: ElasticsearchClient
  ) {}

  public async run({ taskInstance }: TaskRunParams): Promise<RunResult> {
    const state = taskInstance.state as LatestTaskStateSchema;

    try {
      const [stats, executionStats, actionPolicyStats, alertStats] = await Promise.all([
        getRuleStats(this.esClient),
        getExecutionStats(this.esClient),
        getActionPolicyStats(this.esClient),
        getAlertStats(this.esClient),
      ]);

      const updatedState: LatestTaskStateSchema = {
        has_errors: false,
        error_messages: undefined,
        runs: (state.runs ?? 0) + 1,
        ...stats,
        ...executionStats,
        ...actionPolicyStats,
        ...alertStats,
      };

      return { state: updatedState, schedule: SCHEDULE };
    } catch (err) {
      const errorMessage = err && err.message ? err.message : String(err);
      this.logger.warn({ message: `Error executing alerting v2 telemetry task: ${errorMessage}` });

      return {
        state: {
          ...emptyState,
          runs: (state.runs ?? 0) + 1,
          has_errors: true,
          error_messages: [errorMessage],
        },
        schedule: SCHEDULE,
      };
    }
  }
}
