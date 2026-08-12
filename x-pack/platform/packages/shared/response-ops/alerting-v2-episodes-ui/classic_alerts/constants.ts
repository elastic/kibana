/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Classic (v1) alerts-as-data index patterns for observability + stack alerts.
 * These are read aliases; wildcards resolve leniently so an environment without
 * one of the contexts does not error the query.
 *
 * The read goes through the authorized RAC alerts API (`/internal/rac/alerts/find`),
 * which layers the Kibana alerting authorization filter (space + authorized rule
 * types) on top of this index pattern, so unauthorized alerts are never returned.
 */
export const CLASSIC_OBSERVABILITY_ALERTS_INDEX = '.alerts-observability.*';
export const CLASSIC_STACK_ALERTS_INDEX = '.alerts-stack.*';

export const CLASSIC_ALERTS_INDEX = `${CLASSIC_OBSERVABILITY_ALERTS_INDEX},${CLASSIC_STACK_ALERTS_INDEX}`;

export {
  ALERT_MUTED as CLASSIC_ALERT_MUTED_FIELD,
  ALERT_SNOOZED as CLASSIC_ALERT_SNOOZED_FIELD,
} from '@kbn/rule-data-utils';

/** Max classic alerts returned per list/histogram request. Mirrors the v2 list/histogram limits. */
export const CLASSIC_ALERTS_LIST_PAGE_SIZE = 1000;
export const CLASSIC_ALERTS_HISTOGRAM_LIMIT = 10_000;
export const CLASSIC_ALERTS_TAGS_LIMIT = 500;
