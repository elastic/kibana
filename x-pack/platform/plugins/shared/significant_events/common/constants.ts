/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PricingProductFeature } from '@kbn/core-pricing-common';

export const ASSET_VERSION = 1;

export const ATTACHMENT_SUGGESTIONS_LIMIT = 50;

export const STREAMS_PRODUCER = 'streams';
export const STREAMS_RULE_REGISTRATION_CONTEXT = 'streams';

export const STREAMS_API_PRIVILEGES = {
  read: 'read_stream',
  manage: 'manage_stream',
} as const;

export const STREAMS_UI_PRIVILEGES = {
  manage: 'manage',
  show: 'show',
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
 * performs a bounded number of discovery + triage passes so it can drain small
 * backlogs without creating an unbounded scheduled run.
 */
export const DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES = 30;
export const DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES = 10;
export const MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES = 1;
export const DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE = 3;
export const DEFAULT_SIG_EVENTS_SCHEDULED_TRIAGE_BATCH_SIZE = 5;
export const DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES = 3;
export const MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE = 1;
export const MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE = 50;
export const MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES = 1;
export const MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES = 20;
