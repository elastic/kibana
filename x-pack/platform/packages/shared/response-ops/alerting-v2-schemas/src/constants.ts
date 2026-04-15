/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Maximum number of consecutive breaches before transition */
export const MAX_CONSECUTIVE_BREACHES = 1000;

/** Maximum allowed duration for schedule and timeframe fields */
export const MAX_DURATION = '365d';

/** Minimum allowed interval for schedule.every */
export const MIN_SCHEDULE_INTERVAL = '5s';

/** Maximum rules processed in one filter-based bulk operation (select-all). */
export const BULK_FILTER_MAX_RULES = 10_000;
