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
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import type { AlertingTaskRunner } from '../services/task_run_scope_service/create_task_runner';
import { SCHEDULE } from './constants';
import { getActionPolicyStats } from './lib/get_action_policy_stats';
import { getAlertStats } from './lib/get_alert_stats';
import { getExecutionStats } from './lib/get_execution_stats';
import { getRuleStats } from './lib/get_rule_stats';
import { type LatestTaskStateSchema } from './task_state';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'signal'>;

const runStat = async <T>(
  name: string,
  logger: LoggerServiceContract,
  fn: () => Promise<T>
): Promise<T | undefined> => {
  try {
    return await fn();
  } catch (error) {
    logger.warn({
      message: 'Telemetry stat collection failed',
      error,
      code: ALERTING_LOG_CODES.TASKS_TELEMETRY_RUN_FAILED,
      labels: { resource: name },
    });
    return undefined;
  }
};

@injectable()
export class TelemetryTaskRunner implements AlertingTaskRunner {
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract,
    @inject(EsServiceInternalToken) private readonly esClient: ElasticsearchClient
  ) {
    this.logger = loggerService.forSubsystem('tasks');
  }

  public async run({ taskInstance }: TaskRunParams): Promise<RunResult> {
    const state = taskInstance.state as LatestTaskStateSchema;
    const logger = this.logger;

    const [stats, executionStats, actionPolicyStats, alertStats] = await Promise.all([
      runStat('rule_stats', logger, () => getRuleStats(this.esClient)),
      runStat('execution_stats', logger, () => getExecutionStats(this.esClient)),
      runStat('action_policy_stats', logger, () => getActionPolicyStats(this.esClient)),
      runStat('alert_stats', logger, () => getAlertStats(this.esClient)),
    ]);

    const statResults: Array<[string, unknown]> = [
      ['rule_stats', stats],
      ['execution_stats', executionStats],
      ['action_policy_stats', actionPolicyStats],
      ['alert_stats', alertStats],
    ];
    const failedStats = statResults
      .filter(([, result]) => result === undefined)
      .map(([name]) => name);

    const updatedState: LatestTaskStateSchema = {
      has_errors: failedStats.length > 0,
      error_messages: failedStats.length
        ? failedStats.map((name) => `Telemetry stat collection failed: ${name}`)
        : undefined,
      runs: (state.runs ?? 0) + 1,
      ...(stats ?? {}),
      ...(executionStats ?? {}),
      ...(actionPolicyStats ?? {}),
      ...(alertStats ?? {}),
    };

    return { state: updatedState, schedule: SCHEDULE };
  }
}
