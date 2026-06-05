/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { SerializedConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import { TASK_MANAGER_INDEX } from '@kbn/task-manager-plugin/server/constants';
import { TASK_ID as TELEMETRY_TASK_ID } from '../../../../server/lib/usage/constants';
import type { LatestTaskStateSchema as TelemetryTaskState } from '../../../../server/lib/usage/task_state';
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '../constants';

/**
 * Test-time accessor for the telemetry task. Polls the task
 * manager saved object until the telemetry task has produced its first run
 * and exposes the parsed state.
 */
export interface TelemetryService {
  /**
   * Polls until the telemetry task has run at least once (status `idle`,
   * `runs > 0`) and returns the parsed state. Callers typically invoke
   * `apiServices.alertingV2.taskManager.runSoon(...)` first so the wait is
   * deterministic rather than depending on the default schedule.
   */
  waitForState: () => Promise<TelemetryTaskState>;
}

export const getTelemetryService = ({
  log,
  esClient,
}: {
  log: ScoutLogger;
  esClient: EsClient;
}): TelemetryService => {
  const fetchState = async (): Promise<TelemetryTaskState | null> => {
    const taskDoc = await esClient.get<{ task: SerializedConcreteTaskInstance }>({
      id: `task:${TELEMETRY_TASK_ID}`,
      index: TASK_MANAGER_INDEX,
    });

    const task = taskDoc._source?.task;

    if (task?.status !== 'idle' || !task.state) return null;

    const parsed = JSON.parse(task.state) as TelemetryTaskState;
    return parsed.runs > 0 ? parsed : null;
  };

  const unwrap = (state: TelemetryTaskState | null): TelemetryTaskState => {
    if (state === null) {
      throw new Error('Telemetry task state was unexpectedly null after poll resolved');
    }
    return state;
  };

  return {
    waitForState: () =>
      measurePerformanceAsync(log, 'telemetry.waitForState', async () => {
        await expect
          .poll(fetchState, { timeout: POLL_TIMEOUT_MS, intervals: [POLL_INTERVAL_MS] })
          .not.toBeNull();
        return unwrap(await fetchState());
      }),
  };
};
