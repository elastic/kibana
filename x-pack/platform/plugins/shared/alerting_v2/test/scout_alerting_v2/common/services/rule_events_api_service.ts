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
import type {
  AlertEpisodeStatus,
  AlertEvent,
  AlertEventStatus,
  AlertEventType,
} from '../../../../server/resources/datastreams/alert_events';
import { ALERT_EVENTS_DATA_STREAM, POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '../constants';

export interface RuleEventFilter {
  status?: AlertEventStatus;
  type?: AlertEventType;
  episodeStatus?: AlertEpisodeStatus;
}

/**
 * Test-time accessor for the alerting_v2 `.rule-events` data stream.
 *
 * Knows the on-disk schema (`rule.id`, `type`, `status`, `episode.status`,
 * `group_hash`) so specs can read the stream as `apiServices.alertingV2.ruleEvents.find(...)`
 * instead of hand-writing search bodies.
 */
export interface RuleEventsApiService {
  find: (ruleId: string, filter?: RuleEventFilter) => Promise<AlertEvent[]>;
  /** Latest director-processed event per `group_hash` for a rule. */
  getLatestEpisodeStates: (ruleId: string) => Promise<Map<string, AlertEvent>>;
  /** Polls `find(...)` until at least `min` matching events exist. */
  waitForAtLeast: (ruleId: string, min: number, filter?: RuleEventFilter) => Promise<void>;
  /** Removes every document from the `.rule-events` data stream. */
  cleanUp: () => Promise<void>;
}

export const getRuleEventsApiService = ({
  log,
  esClient,
}: {
  log: ScoutLogger;
  esClient: EsClient;
}): RuleEventsApiService => {
  const find: RuleEventsApiService['find'] = (ruleId, filter = {}) =>
    measurePerformanceAsync(log, 'ruleEvents.find', async () => {
      await esClient.indices.refresh({ index: ALERT_EVENTS_DATA_STREAM });
      const must: object[] = [{ term: { 'rule.id': ruleId } }];
      if (filter.type) must.push({ term: { type: filter.type } });
      if (filter.status) must.push({ term: { status: filter.status } });
      if (filter.episodeStatus) {
        must.push({ term: { 'episode.status': filter.episodeStatus } });
      }

      const result = await esClient.search<AlertEvent>({
        index: ALERT_EVENTS_DATA_STREAM,
        query: { bool: { filter: must } },
        sort: [{ '@timestamp': 'asc' }],
        size: 100,
      });
      return result.hits.hits.map((hit) => hit._source as AlertEvent);
    });

  const getLatestEpisodeStates: RuleEventsApiService['getLatestEpisodeStates'] = (ruleId) =>
    measurePerformanceAsync(log, 'ruleEvents.getLatestEpisodeStates', async () => {
      await esClient.indices.refresh({ index: ALERT_EVENTS_DATA_STREAM });
      const result = await esClient.search<AlertEvent>({
        index: ALERT_EVENTS_DATA_STREAM,
        query: {
          bool: {
            filter: [
              { term: { 'rule.id': ruleId } },
              { term: { type: 'alert' } },
              { exists: { field: 'episode.status' } },
            ],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
        size: 100,
        collapse: { field: 'group_hash' },
      });

      const stateMap = new Map<string, AlertEvent>();
      for (const hit of result.hits.hits) {
        const doc = hit._source as AlertEvent;
        stateMap.set(doc.group_hash, doc);
      }
      return stateMap;
    });

  const waitForAtLeast: RuleEventsApiService['waitForAtLeast'] = (ruleId, min, filter) =>
    expect
      .poll(() => find(ruleId, filter).then((events) => events.length), {
        timeout: POLL_TIMEOUT_MS,
        intervals: [POLL_INTERVAL_MS],
      })
      .toBeGreaterThanOrEqual(min);

  const cleanUp: RuleEventsApiService['cleanUp'] = () =>
    measurePerformanceAsync(log, `dataStream[${ALERT_EVENTS_DATA_STREAM}].cleanUp`, async () => {
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
    });

  return { find, getLatestEpisodeStates, waitForAtLeast, cleanUp };
};
