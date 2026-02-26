/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// GCS bucket
export const GCS_BUCKET = 'obs-ai-datasets';
export const GCS_BUCKET_FOLDER = 'sigevents';

// Wait times
export const BASELINE_WAIT_MS = 3 * 60 * 1000;
export const FAILURE_WAIT_MS = 5 * 60 * 1000;
export const FEATURE_EXTRACTION_POLL_INTERVAL_MS = 10_000;
export const FEATURE_EXTRACTION_TIMEOUT_MS = 5 * 60 * 1000;
export const POD_READY_TIMEOUT_S = 300;
export const POD_READY_POLL_INTERVAL_MS = 5_000;

// OTel Demo namespace
export const OTEL_DEMO_NAMESPACE = 'otel-demo';
export const OTEL_DEMO_GCS_BASE_PATH_PREFIX = `${GCS_BUCKET_FOLDER}/${OTEL_DEMO_NAMESPACE}`;

// OTel Demo scenarios
export const SCENARIOS = [
  { id: 'healthy-baseline', isFailure: false },
  { id: 'payment-unreachable', isFailure: true },
  { id: 'cart-redis-cutoff', isFailure: true },
  { id: 'currency-unreachable', isFailure: true },
  { id: 'checkout-memory-starvation', isFailure: true },
  { id: 'flagd-unreachable', isFailure: true },
  { id: 'load-generator-ramp', isFailure: true },
] as const;
