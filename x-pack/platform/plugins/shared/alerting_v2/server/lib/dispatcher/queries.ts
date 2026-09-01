/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type EsqlRequest } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM, ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { AlertEventType } from '../../resources/datastreams/alert_events';
import type { AlertEpisode, ActionGroupId } from './types';
import { episodeSubject, SUBJECT_SEPARATOR } from './steps/utils/subject';

const ALERT_EVENT_TYPE: AlertEventType = 'alert';

// Field-based discrimination (type / action_type IS NULL) instead of `_index LIKE` works around
// an ES|QL regression where `WHERE _index LIKE` before `STATS` returns 0 rows.
// See: https://github.com/elastic/elasticsearch/issues/146318
//
// This scan is keys-only by design: no METADATA _source, no JSON_EXTRACT, no data_json.
// Episode `data` is hydrated lazily by HydrateEpisodeDataStep (getEpisodeDataQueries) for the
// surviving dispatchable set only, which is at most 10 000 episodes rather than the entire
// multi-million-row window. See: https://github.com/elastic/rna-program/issues/838
//
// Rows with a null subject are dropped here: a doc with source "internal" and no rule is
// schema-valid and reaches the index, but has no series identity. Deriving its subject in
// TypeScript throws, which would fail the whole tick and drop every other episode in the batch.
/**
 * Row cap of `getDispatchableAlertEventsQuery`. Kept in sync by a unit test —
 * ES|QL will not accept a bound parameter in a LIMIT clause.
 */
export const EPISODE_QUERY_LIMIT = 10_000;

/**
 * Keys-only episode scan over `.rule-events` ⨝ `.alert-actions`.
 *
 * `gte`/`lte` cap **event** rows only. Action rows (`type IS NULL`) are not
 * window-capped: `StoreActionsStep` stamps `@timestamp` with `now`, which is
 * after `windowEnd` (`startedAt − SETTLE_BUFFER`). If those rows were dropped
 * before `INLINE STATS last_fired`, the overlap re-read would reprocess every
 * already-recorded episode on the next tick.
 */
export const getDispatchableAlertEventsQuery = ({
  gte,
  lte,
}: {
  gte: string;
  lte: string;
}): EsqlRequest => {
  return esql`FROM ${ALERT_EVENTS_DATA_STREAM},${ALERT_ACTIONS_DATA_STREAM}
      | WHERE type IS NULL OR type == ${ALERT_EVENT_TYPE}
      | WHERE type IS NULL OR (@timestamp >= ${gte}::datetime AND @timestamp <= ${lte}::datetime)
      | EVAL
          rule_id = COALESCE(rule.id, rule_id),
          episode_id = COALESCE(episode.id, episode_id),
          episode_status = episode.status
      | EVAL ${SUBJECT_EVAL}
      | WHERE subject IS NOT NULL
      | DROP episode.id, rule.id, episode.status
      | INLINE STATS last_fired = max(last_series_event_timestamp) WHERE action_type == "fire" OR action_type == "suppress" OR action_type == "unmatched" BY subject, group_hash
      | WHERE last_fired IS NULL OR last_fired < @timestamp
      | STATS
          last_event_timestamp = MAX(@timestamp) WHERE type IS NOT NULL,
          last_episode_status = LAST(episode_status, @timestamp) WHERE type IS NOT NULL,
          severity = LAST(severity, @timestamp) WHERE type IS NOT NULL,
          source = LAST(source, @timestamp) WHERE type IS NOT NULL,
          space_id = LAST(space_id, @timestamp) WHERE type IS NOT NULL,
          rule_id = LAST(rule_id, @timestamp) WHERE type IS NOT NULL
          BY subject, group_hash, episode_id
      | WHERE last_event_timestamp IS NOT NULL
      | KEEP last_event_timestamp, rule_id, source, space_id, group_hash, episode_id, last_episode_status, severity
      | RENAME last_episode_status AS episode_status
      | SORT last_event_timestamp asc
      | LIMIT 10000`.toRequest();
};

const PAIR_SEPARATOR = '::';

// Shared subject-derivation expression used in both dispatchable and suppression queries.
// null/absent source is treated as 'internal' for backward compat with legacy action rows.
// Must produce the same key as `episodeSubject`, which documents why the space is folded in.
const SUBJECT_EVAL = esql.exp`subject = CASE(source IS NULL OR source == "internal", rule_id, CONCAT(space_id, ${SUBJECT_SEPARATOR}, source))`;

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
  alertEpisodes: readonly AlertEpisode[]
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
    ...new Set(alertEpisodes.map((ep) => `${episodeSubject(ep)}${PAIR_SEPARATOR}${ep.group_hash}`)),
  ];

  return chunkInClauseLiterals(uniquePairKeys).map((chunk) => {
    const pairValues = chunk.map((key) => esql.str(key));

    return esql`FROM ${ALERT_ACTIONS_DATA_STREAM}
        | EVAL ${SUBJECT_EVAL}
        | WHERE subject IS NOT NULL
        | EVAL _pair_key = CONCAT(subject, ${PAIR_SEPARATOR}, group_hash)
        | WHERE _pair_key IN (${pairValues})
        | WHERE action_type IN ("ack", "unack", "deactivate", "activate", "snooze", "unsnooze")
        | EVAL _snooze_action = CASE(
            action_type == "unsnooze", "unsnooze",
            action_type == "snooze" AND (expiry IS NULL OR expiry > ${minLastEventTimestamp}::datetime), "snooze",
            action_type == "snooze", "snooze_expired"
          )
        | INLINE STATS
            last_snooze_action = LAST(_snooze_action, @timestamp) WHERE action_type IN ("snooze", "unsnooze")
            BY subject, group_hash
        | STATS
            last_ack_action = LAST(action_type, @timestamp) WHERE action_type IN ("ack", "unack"),
            last_deactivate_action = LAST(action_type, @timestamp) WHERE action_type IN ("deactivate", "activate"),
            last_snooze_action = MAX(last_snooze_action),
            source = LAST(source, @timestamp),
            space_id = LAST(space_id, @timestamp),
            rule_id = LAST(rule_id, @timestamp)
          BY subject, group_hash, episode_id
        | EVAL should_suppress = CASE(
            last_snooze_action == "snooze", true,
            last_ack_action == "ack", true,
            last_deactivate_action == "deactivate", true,
            false
          )
        | KEEP rule_id, group_hash, episode_id, should_suppress, last_ack_action, last_deactivate_action, last_snooze_action, source, space_id`.toRequest();
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

// Hydration pass for episode `data`: fetches the full `data` blob from `.rule-events` for the
// surviving dispatchable episodes only (at most 10 000 after the scan-pass LIMIT).
//
// Ordering is load-bearing:
//   - WHERE is the first command so type, episode.id, and the @timestamp range all push down to
//     Lucene; _source is never fetched for non-matching documents.
//   - JSON_EXTRACT sits after WHERE so _source is materialised only for the matching rows.
//   - DROP _source removes it before the STATS buffer.
//
// gte/lte are inlined as ::datetime literals (not passed via the DSL filter) so the builder
// keeps the same EsqlRequest[] shape as its siblings and the range stays part of the ES|QL plan.
//
// LAST(data_json, @timestamp) reproduces the single-pass semantics: the scan pass returns
// last_event_timestamp = MAX(@timestamp) per episode, so the row LAST() picks here is the same
// one the old STATS picked when data_json was in the scan.
//
// Returns one request per chunk (see ESQL_IN_CLAUSE_LITERAL_BUDGET_BYTES). Safe to concat:
// STATS aggregates by episode_id.
export const getEpisodeDataQueries = (
  episodeIds: readonly string[],
  { gte, lte }: { gte: string; lte: string }
): EsqlRequest[] => {
  return chunkInClauseLiterals(episodeIds).map((chunk) => {
    const ids = chunk.map((id) => esql.str(id));

    return esql`FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source
        | WHERE type == ${ALERT_EVENT_TYPE}
            AND episode.id IN (${ids})
            AND @timestamp >= ${gte}::datetime
            AND @timestamp <= ${lte}::datetime
        | EVAL episode_id = episode.id, data_json = JSON_EXTRACT(_source, "$.data")
        | DROP _source
        | STATS data_json = LAST(data_json, @timestamp) BY episode_id
        | KEEP episode_id, data_json`.toRequest();
  });
};
