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
import type { AlertEpisode, NotificationGroupId } from './types';

/**
 * Fetches dispatchable alert events by querying both alert_events and alert_actions data streams.
 *
 * Uses field-based discrimination instead of `_index LIKE` to tell rows apart:
 *  - alert_events has a `type` field ('signal' | 'alert'); alert_actions does not (NULL in ES|QL).
 *  - alert_actions has an `action_type` field; alert_events does not (NULL in ES|QL).
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
      | DROP episode.id, rule.id, episode.status
      | INLINE STATS last_fired = max(last_series_event_timestamp) WHERE action_type == "fire" OR action_type == "suppress" OR action_type == "unmatched" BY rule_id, group_hash
      | WHERE last_fired IS NULL OR last_fired < @timestamp
      | STATS
          last_event_timestamp = MAX(@timestamp) WHERE type IS NOT NULL,
          last_episode_status = LAST(episode_status, @timestamp) WHERE type IS NOT NULL,
          data_json = LAST(data_json, @timestamp) WHERE type IS NOT NULL
          BY rule_id, group_hash, episode_id
      | WHERE last_event_timestamp IS NOT NULL
      | KEEP last_event_timestamp, rule_id, group_hash, episode_id, last_episode_status, data_json
      | RENAME last_episode_status AS episode_status
      | SORT last_event_timestamp asc
      | LIMIT 10000`.toRequest();
};

const PAIR_SEPARATOR = '::';

export const getAlertEpisodeSuppressionsQuery = (alertEpisodes: AlertEpisode[]): EsqlRequest => {
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
  const pairValues = uniquePairKeys.map((key) => esql.str(key));

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
};

export const getLastNotifiedTimestampsQuery = (
  notificationGroupIds: NotificationGroupId[]
): EsqlRequest => {
  const values = notificationGroupIds.map((id) => esql.str(id));
  const whereClause = esql.exp`action_type == "notified" AND notification_group_id IN (${values})`;

  return esql`FROM ${ALERT_ACTIONS_DATA_STREAM}
    | WHERE ${whereClause}
    | STATS last_notified = MAX(@timestamp), episode_status = LAST(episode_status, @timestamp) BY notification_group_id
    | KEEP notification_group_id, last_notified, episode_status
    `.toRequest();
};
