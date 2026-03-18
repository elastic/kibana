/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const GCS_BUCKET = 'significant-events-datasets';

// Wait times
export const BASELINE_WAIT_MS = 3 * 60 * 1000;
export const FAILURE_WAIT_MS = 5 * 60 * 1000;
export const FEATURE_EXTRACTION_POLL_INTERVAL_MS = 10_000;
export const FEATURE_EXTRACTION_TIMEOUT_MS = 5 * 60 * 1000;
export const POD_READY_TIMEOUT_S = 300;
export const POD_READY_POLL_INTERVAL_MS = 5_000;
