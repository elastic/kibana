/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PricingProductFeature } from '@kbn/core-pricing-common';

/**
 * Base route of the Significant Events application. Used by the UI plugin's
 * `appRoute` registration and by server tools that return Kibana deep links.
 */
export const SIGNIFICANT_EVENTS_APP_ROUTE = '/app/significant_events';

export const SIGNIFICANT_EVENTS_FEATURE_ID = 'significantEvents';

export const SIGNIFICANT_EVENTS_API_PRIVILEGES = {
  read: 'read_significant_events',
  manage: 'manage_significant_events',
} as const;

export const SIGNIFICANT_EVENTS_UI_PRIVILEGES = {
  show: 'show',
  manage: 'manage',
} as const;

/**
 * Tiered features
 */
export const SIGNIFICANT_EVENTS_TIERED_FEATURE: PricingProductFeature = {
  id: 'streams:significant-events',
  description: 'Enable significant events feature for streams',
  products: [{ name: 'observability', tier: 'complete' }],
};

export const SIGNIFICANT_EVENT_TIERED_FEATURES = [SIGNIFICANT_EVENTS_TIERED_FEATURE];

/**
 * Continuous KI extraction workflow
 *
 * A scheduled workflow that periodically identifies knowledge indicators (KI)
 * across eligible streams. It selects streams, schedules feature identification
 * tasks, and polls their status until completion or timeout.
 */

// Legacy workflow identity.
//
// The continuous extraction workflow used to be a normal workflow created at
// this hardcoded id in the default space. It is now a managed workflow
// (`system-streams-ki-continuous-onboarding`). This constant is retained so the
// legacy workflow can be deleted on-demand when the user disables continuous
// KI extraction.
export const LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID =
  'workflow-ad83678a-dba7-55d1-8caa-3010f6f46b81';

// Scheduling: the workflow runs every COORDINATOR_INTERVAL_MINUTES with a
// timeout 1 minute shorter to avoid overlapping with the next run.
//
// The coordinator starts onboarding for each eligible stream (features AND
// queries generation, plus best-effort memory) and then polls every stream
// until it reaches a terminal state. Per-stream onboarding is capped at 30m
// and runs in parallel, so the interval must comfortably exceed that ceiling.
export const COORDINATOR_INTERVAL_MINUTES = 35;

// Stream selection: how many streams to process per run and how often
export const DEFAULT_EXTRACTION_INTERVAL_HOURS = 12;
export const MIN_EXTRACTION_INTERVAL_HOURS = 0;
export const MAX_SCHEDULED_STREAMS = 5;

export const POLL_DELAY_SECONDS = 30;

/**
 * Significant Events scheduled discovery workflow.
 *
 * Detection runs at the alert-window cadence. Review runs more frequently and
 * performs a bounded number of discovery passes so it can drain small
 * backlogs without creating an unbounded scheduled run.
 */
export const DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES = 10;
/**
 * Target time window (minutes) within which every active rule must be scanned at least once.
 * The detection workflow divides the fleet across `ceil(fleet / (targetCoverage / interval))`
 * rules per run to honour this bound.
 *
 * Round-robin engages only when `targetCoverageMinutes > detectionIntervalMinutes`
 * (scan_cycles = floor(coverage / interval) ≥ 2). When coverage ≤ interval, scan_cycles clamps
 * to 1 and every active rule is processed on every run.
 *
 * At the default 10-minute detection interval this gives 3 cycles:
 *   scan_cycles = floor(30 / 10) = 3  →  ~33% of the fleet per run, full coverage in 30 min.
 */
export const DEFAULT_SIG_EVENTS_TARGET_COVERAGE_MINUTES = 30;
export const DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES = 10;
export const MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES = 1;

// Detection sensitivity tuning. The change_point aggregation requires between
// MIN_SIG_EVENTS_CHANGE_POINT_BUCKETS and MAX_SIG_EVENTS_CHANGE_POINT_BUCKETS
// date-histogram buckets, so detectionLookbackMinutes must be an exact multiple
// of detectionBucketIntervalMinutes with a quotient inside those bounds — the
// settings route validates the resolved pair.
export const MIN_SIG_EVENTS_CHANGE_POINT_BUCKETS = 22;
export const MAX_SIG_EVENTS_CHANGE_POINT_BUCKETS = 1000;
export const DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES = 1;
export const MIN_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES = 1;
export const MAX_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES = 30;
export const DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_LOOKBACK_MINUTES = 40;
export const MIN_SIG_EVENTS_SCHEDULED_DETECTION_LOOKBACK_MINUTES =
  MIN_SIG_EVENTS_CHANGE_POINT_BUCKETS * MIN_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES;
export const DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE = 3;
export const DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES = 3;
export const MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE = 1;
export const MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE = 50;
export const MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES = 1;
export const MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES = 20;

/**
 * Flaky rule throttle defaults.
 *
 * A rule is treated as flaky when it fires at least
 * DEFAULT_SIG_EVENTS_FLAKY_RULE_DETECTION_THRESHOLD change-point detections
 * inside the detection lookback window. Suppressed rules are probed once their
 * oldest unprocessed detection reaches
 * DEFAULT_SIG_EVENTS_FLAKY_RULE_PROBE_AFTER_MINUTES minutes old.
 * Rules with severity_score at/above
 * DEFAULT_SIG_EVENTS_FLAKY_RULE_EXEMPT_SEVERITY_SCORE are never suppressed.
 */
export const DEFAULT_SIG_EVENTS_FLAKY_RULE_DETECTION_THRESHOLD = 10;
export const MIN_SIG_EVENTS_FLAKY_RULE_DETECTION_THRESHOLD = 2;
export const MAX_SIG_EVENTS_FLAKY_RULE_DETECTION_THRESHOLD = 1000;
export const DEFAULT_SIG_EVENTS_FLAKY_RULE_PROBE_AFTER_MINUTES = 360;
export const MIN_SIG_EVENTS_FLAKY_RULE_PROBE_AFTER_MINUTES = 10;
// Detections age out of the 24h detectionLookback window, so a probe age near 1440 leaves
// almost no time for a scheduled review pass to actually catch it. Capped well below 1440
// for a real chance to fire before the detection disappears.
export const MAX_SIG_EVENTS_FLAKY_RULE_PROBE_AFTER_MINUTES = 1200;
export const DEFAULT_SIG_EVENTS_FLAKY_RULE_EXEMPT_SEVERITY_SCORE = 80;
export const MIN_SIG_EVENTS_FLAKY_RULE_EXEMPT_SEVERITY_SCORE = 0;
// 101 means "no rule is exempt" — severity scores top out at 100.
export const MAX_SIG_EVENTS_FLAKY_RULE_EXEMPT_SEVERITY_SCORE = 101;
