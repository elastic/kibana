/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LAST_EPISODE_TIMESTAMP_VARIABLE = 'lastEpisodeTimestamp';
export const PAGE_SIZE_VARIABLE = 'pageSize';

/**
 * A query to get aggregated alerting v2 episodes data with @timestamp/LIMIT-based pagination.
 *
 * This will be simplified when the `$.alert-episodes` ES|QL view is available.
 */
export const ALERTING_EPISODES_PAGINATED_QUERY = `
FROM .rule-events
| WHERE ?${LAST_EPISODE_TIMESTAMP_VARIABLE} IS NULL OR @timestamp < ?${LAST_EPISODE_TIMESTAMP_VARIABLE}
| INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp) BY episode.id
| EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)
| WHERE @timestamp == last_timestamp AND type == "alert"
| SORT @timestamp DESC
| LIMIT ?${PAGE_SIZE_VARIABLE}
`;

/**
 * A query to get the total count of alerting episodes (used for pagination).
 */
export const ALERTING_EPISODES_COUNT_QUERY = `
FROM .rule-events
| STATS total = COUNT_DISTINCT(episode.id)
`;
