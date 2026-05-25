/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERT_EVENTS_DATA_STREAM = '.rule-events';
export const ALERT_ACTIONS_DATA_STREAM = '.alert-actions';
export const LAST_EPISODE_TIMESTAMP_ESQL_VARIABLE = 'lastEpisodeTimestamp';
export const PAGE_SIZE_ESQL_VARIABLE = 'pageSize';
export const RELATED_ALERT_EPISODES_PAGE_SIZE = 5;
export const TIME_FIELD = '@timestamp';

const ALERTING_V2_SECTION_ID = 'alertingV2';
const ALERTING_V2_RULES_APP_ID = 'rules';
const ALERTING_V2_EPISODES_APP_ID = 'episodes';

// Ideally, these should be computed using the `paths` factory of the alerting-v2-plugin, which
// shouldn't be imported in this package. We should find a way to improve this in the future.
export const ALERTING_V2_RULES_BASE_PATH = `/app/management/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_RULES_APP_ID}`;
export const ALERTING_V2_EPISODES_BASE_PATH = `/app/management/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EPISODES_APP_ID}`;

export const alertEpisodeDetailsPath = (episodeId: string) =>
  `${ALERTING_V2_EPISODES_BASE_PATH}/${encodeURIComponent(episodeId)}`;

export const ruleDetailsPath = (ruleId: string) =>
  `${ALERTING_V2_RULES_BASE_PATH}/${encodeURIComponent(ruleId)}`;
