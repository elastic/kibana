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
import type { AlertAction } from '../../../../server/resources/datastreams/alert_actions';
import { ALERT_ACTIONS_DATA_STREAM, POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '../constants';

export interface AlertActionsFilter {
  ruleId?: string;
  actionTypes?: ReadonlyArray<AlertAction['action_type']>;
}

/**
 * Test-time direct-index accessor for the alerting_v2 `.alert-actions` data
 * stream. This bypasses the plugin's public HTTP surface — use it when a
 * spec needs to seed historical audit rows, assert on the raw persisted
 * documents, or wipe the stream between tests. To exercise the plugin's
 * routes instead, use {@link AlertActionsApiService}.
 */
export interface AlertActionsEventsService {
  /** Bulk-seed historical actions (e.g. ack/snooze/deactivate) to the data stream. */
  seed: (actions: AlertAction[]) => Promise<void>;
  /** Search the data stream by rule id and/or one or more action types. */
  find: (filter?: AlertActionsFilter) => Promise<AlertAction[]>;
  /** Polls `find(...)` until at least `min` matching actions exist. */
  waitForAtLeast: (min: number, filter?: AlertActionsFilter) => Promise<void>;
  /** Removes every document from the `.alert-actions` data stream. */
  cleanUp: () => Promise<void>;
}

export const getAlertActionsEventsService = ({
  log,
  esClient,
}: {
  log: ScoutLogger;
  esClient: EsClient;
}): AlertActionsEventsService => {
  const find: AlertActionsEventsService['find'] = (filter = {}) =>
    measurePerformanceAsync(log, 'alertActionsEvents.find', async () => {
      await esClient.indices.refresh({ index: ALERT_ACTIONS_DATA_STREAM });

      const must: object[] = [];
      if (filter.ruleId) must.push({ term: { rule_id: filter.ruleId } });
      if (filter.actionTypes) must.push({ terms: { action_type: [...filter.actionTypes] } });

      const result = await esClient.search<AlertAction>({
        index: ALERT_ACTIONS_DATA_STREAM,
        query: must.length === 0 ? { match_all: {} } : { bool: { filter: must } },
        sort: [{ '@timestamp': 'asc' }],
        size: 100,
      });
      return result.hits.hits.map((hit) => hit._source as AlertAction);
    });

  const seed: AlertActionsEventsService['seed'] = (actions) =>
    measurePerformanceAsync(log, 'alertActionsEvents.seed', async () => {
      if (actions.length === 0) return;
      await esClient.bulk({
        operations: actions.flatMap((doc) => [
          { create: { _index: ALERT_ACTIONS_DATA_STREAM } },
          doc,
        ]),
        refresh: true,
      });
    });

  const waitForAtLeast: AlertActionsEventsService['waitForAtLeast'] = (min, filter) =>
    expect
      .poll(() => find(filter).then((actions) => actions.length), {
        timeout: POLL_TIMEOUT_MS,
        intervals: [POLL_INTERVAL_MS],
      })
      .toBeGreaterThanOrEqual(min);

  const cleanUp: AlertActionsEventsService['cleanUp'] = () =>
    measurePerformanceAsync(log, `dataStream[${ALERT_ACTIONS_DATA_STREAM}].cleanUp`, async () => {
      await esClient.deleteByQuery(
        {
          index: ALERT_ACTIONS_DATA_STREAM,
          query: { match_all: {} },
          refresh: true,
          wait_for_completion: true,
          conflicts: 'proceed',
        },
        { ignore: [404] }
      );
    });

  return { seed, find, waitForAtLeast, cleanUp };
};
