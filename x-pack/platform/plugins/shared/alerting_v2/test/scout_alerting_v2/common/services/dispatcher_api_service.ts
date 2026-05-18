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
import { ACTION_POLICY_EVENT_PROVIDER } from '../../../../server/lib/dispatcher/steps/constants';
import type { ActionPolicyEventAction } from '../../../../server/lib/dispatcher/steps/constants';
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '../constants';
import { countTaskRuns } from './task_event_log';

const EVENT_LOG_INDEX = '.kibana-event-log*';

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

export interface CountDispatcherEventLogEntriesParams {
  /** Which dispatcher outcome to count: dispatched, throttled, or unmatched. */
  action: ActionPolicyEventAction;
  /** Lower bound (inclusive) for `@timestamp`, in milliseconds since epoch. */
  sinceMs: number;
}

export interface WaitForDispatcherEventLogEntriesParams
  extends CountDispatcherEventLogEntriesParams {
  /** Minimum number of matching entries to wait for. */
  expected: number;
}

/**
 * Test-time accessor for the alerting_v2 dispatcher singleton task and the
 * execution-history records its `StoreExecutionHistoryStep` writes into the
 * Kibana event log.
 */
export interface DispatcherApiService {
  waitForDispatcherTick: (params?: WaitForDispatcherTickParams) => Promise<void>;
  /**
   * Counts entries the dispatcher emits into `.kibana-event-log*` since
   * `sinceMs`.
   */
  countDispatcherEventLogEntries: (params: CountDispatcherEventLogEntriesParams) => Promise<number>;
  /**
   * Polls `countDispatcherEventLogEntries` until at least `expected` entries
   * are visible. Uses the shared poll timeout so flakes due to event-log
   * indexing lag stay bounded.
   */
  waitForDispatcherEventLogEntries: (
    params: WaitForDispatcherEventLogEntriesParams
  ) => Promise<void>;
}

export const getDispatcherApiService = ({
  log,
  esClient,
}: {
  log: ScoutLogger;
  esClient: EsClient;
}): DispatcherApiService => {
  const countDispatcherEventLogEntries: DispatcherApiService['countDispatcherEventLogEntries'] = ({
    action,
    sinceMs,
  }) =>
    measurePerformanceAsync(log, `dispatcher.countEventLogEntries[${action}]`, async () => {
      await esClient.indices.refresh({ index: EVENT_LOG_INDEX }, { ignore: [404] });
      const result = await esClient.count({
        index: EVENT_LOG_INDEX,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              { term: { 'event.provider': ACTION_POLICY_EVENT_PROVIDER } },
              { term: { 'event.action': action } },
              { range: { '@timestamp': { gte: new Date(sinceMs).toISOString() } } },
            ],
          },
        },
      });
      return result.count;
    });

  return {
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

    countDispatcherEventLogEntries,

    waitForDispatcherEventLogEntries: ({ action, sinceMs, expected }) =>
      measurePerformanceAsync(
        log,
        `dispatcher.waitForEventLogEntries[${action}>=${expected}]`,
        async () => {
          await expect
            .poll(() => countDispatcherEventLogEntries({ action, sinceMs }), {
              timeout: POLL_TIMEOUT_MS,
              intervals: [POLL_INTERVAL_MS],
            })
            .toBeGreaterThanOrEqual(expected);
        }
      ),
  };
};
