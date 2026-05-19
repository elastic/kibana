/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const OSQUERY_API_VERSION = '2023-10-31';

/**
 * Osquery Monaco editor debounces `onChange` at 500ms (`public/editor/index.tsx`); RHF can still
 * see an empty `query` until that fires. Wait slightly longer after model text matches before Submit.
 */
export const MONACO_TO_RHF_SETTLE_MS = 600;

/** Two-second pause before clicking live-query Submit so RHF / layout can settle. */
export const LIVE_QUERY_SUBMIT_PRE_CLICK_MS = 2_000;

/** Max wait for live query / pack results to surface in the UI (Fleet + agent variance). */
export const OSQUERY_UI_RESULTS_TIMEOUT_MS = 240_000;
