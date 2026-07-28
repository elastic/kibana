/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ALERT_EVENTS_DATA_STREAM,
  ALERT_ACTIONS_DATA_STREAM,
  DEFAULT_TIME_FIELD as TIME_FIELD,
} from '@kbn/alerting-v2-constants';

export const EPISODES_LIST_PAGE_SIZE = 1000;
export const HISTOGRAM_EPISODE_LIMIT = 10_000;
export const RELATED_EPISODES_LIMIT = 5;
export const DEFAULT_ACTIONS_HISTORY_PAGE_SIZE = 25;
export const TAG_OPTIONS_LIMIT = 500;
export const TAG_SUGGESTIONS_LIMIT = 20;
export const DEFAULT_FLAPPING_LOOKBACK = 10;
