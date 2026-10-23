/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { DISPATCHER_TASK_ID } from '../../../../server/lib/dispatcher/constants';
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '../constants';
import { countTaskRuns } from './task_event_log';

export interface WaitForDispatcherTickParams {
  /** Number of dispatcher ticks to wait for. Defaults to 1. */
  ticks?: number;
  /**
   * Lower bound (inclusive) for `event.start` of matching task-run events.
   * Defaults to the time the call was made, i.e. "wait for `ticks` more
   * dispatcher ticks from now".
   */
  since?: Date;
}

/**
 * Test-time accessor for the alerting_v2 dispatcher singleton task.
 */
export interface DispatcherApiService {
  waitForDispatcherTick: (params?: WaitForDispatcherTickParams) => Promise<void>;
}

export const getDispatcherApiService = ({
  log,
  esClient,
}: {
  log: ScoutLogger;
  esClient: EsClient;
}): DispatcherApiService => ({
  waitForDispatcherTick: ({ ticks = 1, since } = {}) =>
    measurePerformanceAsync(log, `dispatcher.waitForDispatcherTick[${ticks}]`, async () => {
      const sinceMs = (since ?? new Date()).getTime();

      await expect
        .poll(() => countTaskRuns({ esClient, taskId: DISPATCHER_TASK_ID, sinceMs }), {
          timeout: POLL_TIMEOUT_MS,
          intervals: [POLL_INTERVAL_MS],
        })
        .toBeGreaterThanOrEqual(ticks);
    }),
});
