/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Registrations that arrive within this window, for example from a graph build, share a request. */
export const STATS_BATCH_DEBOUNCE_MS = 300;

// Provisional: the poll interval is open in ingest-dev#10027.
export const STATS_POLL_INTERVAL_MS = 30_000;

/** A value younger than this is not fetched again when a component registers. */
export const STATS_FRESHNESS_MS = STATS_POLL_INTERVAL_MS;

/** After this many failed fetches in a row, polling stops until the user refreshes. */
export const STATS_MAX_CONSECUTIVE_FAILURES = 3;

/** The code of an entry when the whole request failed. Component errors keep the server's code. */
export const STATS_REQUEST_FAILED_ERROR_CODE = 'request_failed';
