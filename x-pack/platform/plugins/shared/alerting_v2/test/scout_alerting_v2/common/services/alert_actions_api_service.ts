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
import type { AlertEvent } from '../../../../server/resources/datastreams/alert_events';
import {
  ALERT_ACTIONS_DATA_STREAM,
  ALERT_EVENTS_DATA_STREAM,
  DISPATCHER_SYSTEM_ACTION_TYPES,
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
} from '../constants';

export interface AlertActionsFilter {
  ruleId?: string;
  actionTypes?: ReadonlyArray<AlertAction['action_type']>;
}

/**
 * Shape accepted by `seedEvents`. Callers always provide `group_hash` (the
 * alert-action endpoints look events up by it); every other field is filled
 * in with sensible defaults so a typical seed is one line.
 */
export interface SeedAlertEventInput extends Partial<AlertEvent> {
  group_hash: string;
}

/**
 * Test-time accessor for the alerting_v2 `.alert-actions` data stream.
 */
export interface AlertActionsApiService {
  /** Bulk-seed historical actions (e.g. ack/snooze/deactivate) to the data stream. */
  seed: (actions: AlertAction[]) => Promise<void>;
  /**
   * Bulk-index events into `.rule-events` so alert-action endpoints can
   * resolve them by `group_hash` (and `episode.id` for typed actions). Defaults
   * `@timestamp = now`, `type = 'alert'`, `status = 'breached'`,
   * `space_id = 'default'`, `rule.version = 1`.
   */
  seedEvents: (events: SeedAlertEventInput[]) => Promise<void>;
  /** Search the data stream by rule id and/or one or more action types. */
  find: (filter?: AlertActionsFilter) => Promise<AlertAction[]>;
  /**
   * Returns user-written actions in `.alert-actions` for the given rule_ids,
   * sorted by `@timestamp` ascending. Dispatcher-written action_types
   * (`fire`/`suppress`/`unmatched`/`notified`) are filtered out so assertions
   * about user actions remain deterministic.
   */
  findActions: (ruleIds: string[]) => Promise<AlertAction[]>;
  /** Polls `find(...)` until at least `min` matching actions exist. */
  waitForAtLeast: (min: number, filter?: AlertActionsFilter) => Promise<void>;
  /** Removes every document from the `.alert-actions` data stream. */
  cleanUp: () => Promise<void>;
  /** Wipes both `.rule-events` and `.alert-actions`. */
  cleanUpAll: () => Promise<void>;
}

const buildAlertEvent = (input: SeedAlertEventInput): AlertEvent => {
  const now = new Date().toISOString();
  return {
    '@timestamp': now,
    scheduled_timestamp: now,
    rule: { id: 'scout-rule-id', version: 1 },
    data: {},
    status: 'breached',
    source: 'scout-test',
    type: 'alert',
    space_id: 'default',
    ...input,
  };
};

export const getAlertActionsApiService = ({
  log,
  esClient,
}: {
  log: ScoutLogger;
  esClient: EsClient;
}): AlertActionsApiService => {
  const find: AlertActionsApiService['find'] = (filter = {}) =>
    measurePerformanceAsync(log, 'alertActions.find', async () => {
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

  const seed: AlertActionsApiService['seed'] = (actions) =>
    measurePerformanceAsync(log, 'alertActions.seed', async () => {
      if (actions.length === 0) return;
      await esClient.bulk({
        operations: actions.flatMap((doc) => [
          { create: { _index: ALERT_ACTIONS_DATA_STREAM } },
          doc,
        ]),
        refresh: true,
      });
    });

  const seedEvents: AlertActionsApiService['seedEvents'] = (events) =>
    measurePerformanceAsync(log, 'alertActions.seedEvents', async () => {
      if (events.length === 0) return;
      const docs = events.map(buildAlertEvent);
      await esClient.bulk({
        operations: docs.flatMap((doc) => [{ create: { _index: ALERT_EVENTS_DATA_STREAM } }, doc]),
        refresh: 'wait_for',
      });
    });

  const findActions: AlertActionsApiService['findActions'] = (ruleIds) =>
    measurePerformanceAsync(log, 'alertActions.findActions', async () => {
      await esClient.indices.refresh({ index: ALERT_ACTIONS_DATA_STREAM });
      const result = await esClient.search<AlertAction>({
        index: ALERT_ACTIONS_DATA_STREAM,
        query: {
          bool: {
            must_not: [{ terms: { action_type: [...DISPATCHER_SYSTEM_ACTION_TYPES] } }],
            filter: [{ terms: { rule_id: ruleIds } }],
          },
        },
        sort: [{ '@timestamp': 'asc' }],
        size: 100,
      });
      return result.hits.hits.map((hit) => hit._source as AlertAction);
    });

  const waitForAtLeast: AlertActionsApiService['waitForAtLeast'] = (min, filter) =>
    expect
      .poll(() => find(filter).then((actions) => actions.length), {
        timeout: POLL_TIMEOUT_MS,
        intervals: [POLL_INTERVAL_MS],
      })
      .toBeGreaterThanOrEqual(min);

  const cleanUp: AlertActionsApiService['cleanUp'] = () =>
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

  const cleanUpAll: AlertActionsApiService['cleanUpAll'] = () =>
    measurePerformanceAsync(log, 'alertActions.cleanUpAll', async () => {
      await esClient.deleteByQuery(
        {
          index: ALERT_EVENTS_DATA_STREAM,
          query: { match_all: {} },
          refresh: true,
          wait_for_completion: true,
          conflicts: 'proceed',
        },
        { ignore: [404] }
      );
      await cleanUp();
    });

  return { seed, seedEvents, find, findActions, waitForAtLeast, cleanUp, cleanUpAll };
};
