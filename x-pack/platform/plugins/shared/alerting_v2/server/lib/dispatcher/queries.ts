/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type EsqlRequest } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM } from '../../resources/datastreams/alert_actions';
import {
  ALERT_EVENTS_DATA_STREAM,
  type AlertEventType,
} from '../../resources/datastreams/alert_events';
import type { AlertEpisode, ActionGroupId } from './types';

/**
 * Fetches dispatchable alert events by querying both alert_events and alert_actions data streams.
 *
 * Uses field-based discrimination instead of `_index LIKE` to tell rows apart:
 *  - alert_events has a `type` field ('signal' | 'alert'); alert_actions does not (NULL in ES|QL).
 *  - alert_actions has an `action_type` field; alert_events does not (NULL in ES|QL).
 *
 * `_source` is dropped immediately after the EVAL that consumes it. The ES|QL planner does
 * not auto-prune `METADATA _source`, so without an explicit DROP it would ride through the
 * INLINE STATS hash-join buffer and push the per-shard sub-plan output past the ~16.8 MB
 * limit at production volumes (data is `flattened`, only addressable via `_source`).
 *
 * This avoids an ES|QL regression where `WHERE _index LIKE` before `STATS` in a multi-index
 * query returns 0 rows. See: https://github.com/elastic/elasticsearch/issues/146318
 */
export const getDispatchableAlertEventsQuery = (): EsqlRequest => {
  const alertEventType: AlertEventType = 'alert';

  return esql`FROM ${ALERT_EVENTS_DATA_STREAM},${ALERT_ACTIONS_DATA_STREAM} METADATA _source
      | WHERE type IS NULL OR type == ${alertEventType}
      | EVAL
          rule_id = COALESCE(rule.id, rule_id),
          episode_id = COALESCE(episode.id, episode_id),
          episode_status = episode.status,
          data_json = CASE(type IS NOT NULL, JSON_EXTRACT(_source, "$.data"), NULL)
      | DROP episode.id, rule.id, episode.status, _source
      | INLINE STATS last_fired = max(last_series_event_timestamp) WHERE action_type == "fire" OR action_type == "suppress" OR action_type == "unmatched" BY rule_id, group_hash
      | WHERE last_fired IS NULL OR last_fired < @timestamp
      | STATS
          last_event_timestamp = MAX(@timestamp) WHERE type IS NOT NULL,
          last_episode_status = LAST(episode_status, @timestamp) WHERE type IS NOT NULL,
          data_json = LAST(data_json, @timestamp) WHERE type IS NOT NULL,
          severity = LAST(severity, @timestamp) WHERE type IS NOT NULL
          BY rule_id, group_hash, episode_id
      | WHERE last_event_timestamp IS NOT NULL
      | KEEP last_event_timestamp, rule_id, group_hash, episode_id, last_episode_status, data_json, severity
      | RENAME last_episode_status AS episode_status
      | SORT last_event_timestamp asc
      | LIMIT 10000`.toRequest();
};

const PAIR_SEPARATOR = '::';

/**
 * Maximum bytes to allocate to in-clause literals per chunked ES|QL query.
 *
 * ES|QL has a hard 1,000,000-byte cap on the statement text. The two
 * dispatcher queries that inline pipeline-state-derived inputs as quoted
 * literals inside `IN (...)` (`getAlertEpisodeSuppressionsQueries` and
 * `getLastNotifiedTimestampsQueries`) can exceed that cap at LIMIT-sized
 * batches, producing `parsing_exception: ESQL statement is too large`.
 * Because the dispatcher does not advance its watermark on `step_error`,
 * a single offending tick stalls every subsequent tick permanently.
 *
 * The 600 KB budget is intentionally well below the cap to leave room for:
 *   - the static query body (FROM/EVAL/WHERE/STATS/...) which is < 2 KB
 *     for either current query, but may grow,
 *   - escape characters added when literals contain quotes,
 *   - future ES|QL grammar/serialization changes that grow the per-literal
 *     cost,
 *   - downstream proxy/transport headers that may add fixed overhead.
 */
export const ESQL_IN_CLAUSE_LITERAL_BUDGET_BYTES = 600_000;

/**
 * Per-literal serialization cost in the ES|QL `IN (...)` clause.
 *
 * Each literal is rendered as `"<value>", ` — that's two surrounding quotes,
 * a comma, and a space (4 bytes) on top of the literal length. We add 2 more
 * bytes as a margin for backslash escapes when the value contains quotes,
 * for a total overhead of `length + 6` bytes per literal.
 */
const PER_LITERAL_OVERHEAD_BYTES = 6;

/**
 * Split a list of literal values into groups small enough to be safely
 * embedded inside an ES|QL `IN (...)` clause without exceeding the statement
 * size cap.
 *
 * Exported for unit testing of chunk boundaries; production callers should
 * use {@link getAlertEpisodeSuppressionsQueries} or
 * {@link getLastNotifiedTimestampsQueries}, which apply this helper internally.
 *
 * Pathological case: a single literal whose serialized size exceeds the
 * budget is placed alone in its own chunk. The resulting query may still
 * exceed the ES|QL cap; in practice every key passed in is a UUID/hash with
 * bounded length (≤ ~150 bytes), so this is unreachable.
 */
export const chunkInClauseLiterals = (literals: readonly string[]): string[][] => {
  if (literals.length === 0) return [];

  const chunks: string[][] = [];
  let current: string[] = [];
  let currentSize = 0;

  for (const literal of literals) {
    const cost = literal.length + PER_LITERAL_OVERHEAD_BYTES;
    if (current.length > 0 && currentSize + cost > ESQL_IN_CLAUSE_LITERAL_BUDGET_BYTES) {
      chunks.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(literal);
    currentSize += cost;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
};

/**
 * Build the ES|QL request(s) that fetch suppression state for a batch of
 * alert episodes.
 *
 * Returns an array because the `WHERE _pair_key IN (...)` clause is chunked
 * to keep each emitted statement under the ES|QL 1 MB cap (see
 * {@link ESQL_IN_CLAUSE_LITERAL_BUDGET_BYTES}). Aggregation correctness is
 * preserved across chunks: the `INLINE STATS BY rule_id, group_hash` and
 * `STATS BY rule_id, group_hash, episode_id` aggregations partition by the
 * chunk key (or finer), so no row ever participates in two chunks'
 * aggregations and concatenated results are identical to a single-query
 * result.
 *
 * `minLastEventTimestamp` is computed once from the full input and reused
 * across every chunk's snooze-expiry filter so the filter semantics do not
 * shift with the chunking.
 */
export const getAlertEpisodeSuppressionsQueries = (
  alertEpisodes: AlertEpisode[]
): EsqlRequest[] => {
  if (alertEpisodes.length === 0) return [];

  const minLastEventTimestamp =
    alertEpisodes.reduce<string | undefined>((min, ep) => {
      const parsedTimestamp = new Date(ep.last_event_timestamp);
      if (Number.isNaN(parsedTimestamp.getTime())) {
        return min;
      }

      const normalizedTimestamp = parsedTimestamp.toISOString();
      return min === undefined || normalizedTimestamp < min ? normalizedTimestamp : min;
    }, undefined) ?? new Date(0).toISOString();

  const uniquePairKeys = [
    ...new Set(alertEpisodes.map((ep) => `${ep.rule_id}${PAIR_SEPARATOR}${ep.group_hash}`)),
  ];

  return chunkInClauseLiterals(uniquePairKeys).map((chunk) => {
    const pairValues = chunk.map((key) => esql.str(key));

    return esql`FROM ${ALERT_ACTIONS_DATA_STREAM}
        | EVAL _pair_key = CONCAT(rule_id, ${PAIR_SEPARATOR}, group_hash)
        | WHERE _pair_key IN (${pairValues})
        | WHERE action_type IN ("ack", "unack", "deactivate", "activate", "snooze", "unsnooze")
        | WHERE action_type != "snooze" OR expiry > ${minLastEventTimestamp}::datetime
        | INLINE STATS
            last_snooze_action = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze")
            BY rule_id, group_hash
        | STATS
            last_ack_action = LAST(action_type, @timestamp) WHERE action_type IN ("ack", "unack"),
            last_deactivate_action = LAST(action_type, @timestamp) WHERE action_type IN ("deactivate", "activate"),
            last_snooze_action = MAX(last_snooze_action)
          BY rule_id, group_hash, episode_id
        | EVAL should_suppress = CASE(
            last_snooze_action == "snooze", true,
            last_ack_action == "ack", true,
            last_deactivate_action == "deactivate", true,
            false
          )
        | KEEP rule_id, group_hash, episode_id, should_suppress, last_ack_action, last_deactivate_action, last_snooze_action`.toRequest();
  });
};

/**
 * Build the ES|QL request(s) that fetch last-notified timestamps for a batch
 * of action groups.
 *
 * Returns an array for the same statement-size reason as
 * {@link getAlertEpisodeSuppressionsQueries}. The query's only aggregation
 * (`STATS ... BY action_group_id`) partitions by the same key the chunks are
 * partitioned on, so concatenated results equal a single-query result.
 */
export const getLastNotifiedTimestampsQueries = (
  actionGroupIds: ActionGroupId[]
): EsqlRequest[] => {
  if (actionGroupIds.length === 0) return [];

  return chunkInClauseLiterals(actionGroupIds).map((chunk) => {
    const values = chunk.map((id) => esql.str(id));
    const whereClause = esql.exp`action_type == "notified" AND action_group_id IN (${values})`;

    return esql`FROM ${ALERT_ACTIONS_DATA_STREAM}
      | WHERE ${whereClause}
      | STATS last_notified = MAX(@timestamp), episode_status = LAST(episode_status, @timestamp) BY action_group_id
      | KEEP action_group_id, last_notified, episode_status
      `.toRequest();
  });
};
