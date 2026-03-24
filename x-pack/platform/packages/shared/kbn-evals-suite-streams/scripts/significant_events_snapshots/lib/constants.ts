/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Scenario } from './types';

export const DEFAULT_LOGS_INDEX = 'logs';
export const DEFAULT_DEMO_APP = 'otel-demo';

export const GCS_BUCKET = 'significant-events-datasets';
export const OTEL_DEMO_NAMESPACE = DEFAULT_DEMO_APP;
export const OTEL_DEMO_GCS_BASE_PATH_PREFIX = OTEL_DEMO_NAMESPACE;

// Wait times
export const BASELINE_WAIT_MS = 3 * 60 * 1000;
export const FAILURE_WAIT_MS = 5 * 60 * 1000;
export const KI_FEATURE_EXTRACTION_POLL_INTERVAL_MS = 10_000;
export const KI_FEATURE_EXTRACTION_TIMEOUT_MS = 5 * 60 * 1000;

export const HEALTHY_BASELINE_SCENARIO: Scenario = { id: 'healthy-baseline' };
