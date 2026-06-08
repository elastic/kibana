/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PricingProductFeature } from '@kbn/core-pricing-common';

export const ASSET_VERSION = 1;

export const ATTACHMENT_SUGGESTIONS_LIMIT = 50;

export const STREAMS_FEATURE_ID = 'streams';
export const STREAMS_CONSUMER = 'streams';
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
export const STREAMS_TIERED_ML_FEATURE: PricingProductFeature = {
  id: 'streams:ml-features',
  description: 'Enable ML features for streams',
  products: [{ name: 'observability', tier: 'complete' }],
};

export const STREAMS_TIERED_AI_FEATURE: PricingProductFeature = {
  id: 'streams:ai-features',
  description: 'Enable AI features for streams',
  products: [{ name: 'observability', tier: 'complete' }],
};

export const STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE: PricingProductFeature = {
  id: 'streams:significant-events',
  description: 'Enable significant events feature for streams',
  products: [{ name: 'observability', tier: 'complete' }],
};

export const STREAMS_TIERED_FEATURES = [
  STREAMS_TIERED_ML_FEATURE,
  STREAMS_TIERED_AI_FEATURE,
  STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE,
];

export const FAILURE_STORE_SELECTOR = '::failures';

export const STREAMS_SETTINGS_DOCUMENT_ID = 'kibana_streams_settings';
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
 * Sigevents memory data stream backing MemoryServiceImpl.
 */
export const MEMORIES_DATA_STREAM = '.significant_events-memories';

/** Display name for the gap detection workflow (must match gap_detection_workflow.yaml). */
export const GAP_DETECTION_WORKFLOW_NAME = 'Gap Detection';
