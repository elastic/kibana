/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type EsqlRequest } from '@kbn/esql-language';
import {
  ALERT_ACTIONS_BACKING_INDEX,
  ALERT_ACTIONS_DATA_STREAM,
} from '../../resources/alert_actions';
import {
  ALERT_EVENTS_BACKING_INDEX,
  ALERT_EVENTS_DATA_STREAM,
  type AlertEventType,
} from '../../resources/alert_events';

export const getDispatchableAlertEventsQuery = (): EsqlRequest => {
  const alertEventType: AlertEventType = 'alert';

  return esql`FROM ${ALERT_EVENTS_DATA_STREAM},${ALERT_ACTIONS_DATA_STREAM} METADATA _index
      | WHERE (_index LIKE ${ALERT_ACTIONS_BACKING_INDEX}) OR (_index LIKE ${ALERT_EVENTS_BACKING_INDEX} and type == ${alertEventType})
      | EVAL 
          rule_id = COALESCE(rule.id, rule_id),
          episode_id = COALESCE(episode.id, episode_id),
          episode_status = episode.status
      | DROP episode.id, rule.id, episode.status
      | INLINE STATS last_fired = max(last_series_event_timestamp) WHERE _index LIKE ${ALERT_ACTIONS_BACKING_INDEX} AND action_type == "fire-event" BY rule_id, group_hash
      | WHERE (last_fired IS NULL OR last_fired < @timestamp) or (_index LIKE ${ALERT_ACTIONS_BACKING_INDEX})
      | STATS
          last_event_timestamp = MAX(@timestamp) WHERE _index LIKE ${ALERT_EVENTS_BACKING_INDEX}
          BY rule_id, group_hash, episode_id, episode_status
      | WHERE last_event_timestamp IS NOT NULL
      | KEEP last_event_timestamp, rule_id, group_hash, episode_id, episode_status
      | SORT last_event_timestamp desc
      | LIMIT 10000`.toRequest();
};
