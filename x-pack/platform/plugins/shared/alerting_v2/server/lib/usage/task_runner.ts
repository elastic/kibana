/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RunContext, IntervalSchedule } from '@kbn/task-manager-plugin/server';
import { emptyState, type LatestTaskStateSchema } from './task_state';
import { getRuleStats } from './lib/get_rule_stats';
import { getExecutionStats } from './lib/get_execution_stats';
import { getNotificationPolicyStats } from './lib/get_notification_policy_stats';
import { getAlertStats } from './lib/get_alert_stats';

export function telemetryTaskRunner(
  logger: Logger,
  schedule: IntervalSchedule,
  getEsClient: () => ElasticsearchClient
) {
  return ({ taskInstance }: RunContext) => {
    const state = taskInstance.state as LatestTaskStateSchema;

    return {
      async run() {
        try {
          const esClient = getEsClient();
          const [stats, executionStats, notificationPolicyStats, alertStats] = await Promise.all([
            getRuleStats(esClient),
            getExecutionStats(esClient),
            getNotificationPolicyStats(esClient),
            getAlertStats(esClient),
          ]);

          const updatedState: LatestTaskStateSchema = {
            has_errors: false,
            error_messages: undefined,
            runs: (state.runs ?? 0) + 1,
            ...stats,
            ...executionStats,
            ...notificationPolicyStats,
            ...alertStats,
          };

          return { state: updatedState, schedule };
        } catch (err) {
          const errorMessage = err && err.message ? err.message : String(err);
          logger.warn(`Error executing alerting v2 telemetry task: ${errorMessage}`);

          return {
            state: {
              ...emptyState,
              runs: (state.runs ?? 0) + 1,
              has_errors: true,
              error_messages: [errorMessage],
            },
            schedule,
          };
        }
      },
    };
  };
}
