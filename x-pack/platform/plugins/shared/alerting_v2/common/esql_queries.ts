/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RULE_EVENTS_DATA_STREAM = '.rule-events';
export const ALERT_ACTIONS_DATA_STREAM = '.alert-actions';

export const RULE_EVENTS_ESQL = `FROM ${RULE_EVENTS_DATA_STREAM}`;

export const ALERT_ACTIONS_ESQL = `FROM ${ALERT_ACTIONS_DATA_STREAM}`;

/**
 * ES|QL query that computes one row per alert episode, keeping only the latest
 * event for each episode. This is the same logic used by the $.alert-episodes
 * ES|QL view but inlined so it works in serverless where views are not supported.
 */
export const ALERT_EPISODES_ESQL = `FROM ${RULE_EVENTS_DATA_STREAM}
| INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp) BY episode.id
| EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)
| WHERE @timestamp == last_timestamp AND type == "alert"
| SORT @timestamp DESC`;
