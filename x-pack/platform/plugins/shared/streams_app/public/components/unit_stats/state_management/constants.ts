/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Registrations that arrive within this window, for example from a graph build, share a request. */
export const STATS_BATCH_DEBOUNCE_MS = 300;

export const STATS_POLL_INTERVAL_MS = 30_000;

/**
 * What the stats of the Map cover. The Map sends no window, so the server chooses its default of 15
 * minutes (`UNIT_STATS_DEFAULT_WINDOW_MS` in the streams server). Keep the two the same. Text that
 * says how long the stats cover reads this.
 */
export const STATS_DEFAULT_WINDOW_MINUTES = 15;

/** A value younger than this is not fetched again when a component registers. */
export const STATS_FRESHNESS_MS = STATS_POLL_INTERVAL_MS;
