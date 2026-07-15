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

// Field-based discrimination (type / action_type IS NULL) instead of `_index LIKE` works around
// an ES|QL regression where `WHERE _index LIKE` before `STATS` returns 0 rows.
// See: https://github.com/elastic/elasticsearch/issues/146318
//
// `_source` is dropped after JSON_EXTRACT because ES|QL does not auto-prune METADATA fields;
// without the explicit DROP it rides through the INLINE STATS buffer and can exceed ~16.8 MB.
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

// ES|QL caps statement text at 1 MB. IN-list queries exceed this at production cardinality,
// producing `parsing_exception: ESQL statement is too large`. Without chunking the dispatcher
// watermark never advances past the offending tick. 600 KB leaves headroom for the static
// query body and escape overhead.
export const ESQL_IN_CLAUSE_LITERAL_BUDGET_BYTES = 600_000;

// `"<value>", ` = 2 quotes + comma + space (4 bytes) + 2 escape-margin bytes per literal.
const PER_LITERAL_OVERHEAD_BYTES = 6;

// Exported for unit-testing chunk boundaries. An oversized single literal gets its own chunk;
// at ≤150-byte keys (UUID/hash) this is unreachable in practice.
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

// Returns one request per chunk (see ESQL_IN_CLAUSE_LITERAL_BUDGET_BYTES). Safe to concat:
// aggregations key on rule_id/group_hash so no row spans two chunks. minLastEventTimestamp
// is computed from the full input so snooze-expiry classification is consistent across chunks.
//
// Expired snoozes are mapped to "snooze_expired" instead of being filtered out: they must stay
// in the row set so LAST() still picks them as the latest snooze intent. Dropping them before
// LAST() would resurrect an older snooze (e.g. an indefinite one) for the same series.
export const getAlertEpisodeSuppressionsQueries = (
  alertEpisodes: AlertEpisode[]
): EsqlRequest[] => {
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
        | EVAL _snooze_action = CASE(
            action_type == "unsnooze", "unsnooze",
            action_type == "snooze" AND (expiry IS NULL OR expiry > ${minLastEventTimestamp}::datetime), "snooze",
            action_type == "snooze", "snooze_expired"
          )
        | INLINE STATS
            last_snooze_action = LAST(_snooze_action, @timestamp) WHERE action_type IN ("snooze", "unsnooze")
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

// Returns one request per chunk (see ESQL_IN_CLAUSE_LITERAL_BUDGET_BYTES). Safe to concat:
// STATS aggregates by action_group_id, the same key used for chunking.
export const getLastNotifiedTimestampsQueries = (
  actionGroupIds: ActionGroupId[]
): EsqlRequest[] => {
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
