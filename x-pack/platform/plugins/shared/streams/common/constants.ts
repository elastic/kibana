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

export const MAX_STREAM_NAME_LENGTH = 200;

/**
 * Agent Builder / Onechat integration constants
 */

/**
 * Attachment type ID for stream attachments
 */
export const STREAMS_ATTACHMENT_TYPE_ID = 'streams.stream';

/**
 * Tool IDs for agent builder tools
 */
export const STREAMS_SUGGEST_PARTITIONS_TOOL_ID = 'streams.suggest_partitions';
export const STREAMS_SUGGEST_PIPELINE_TOOL_ID = 'streams.suggest_pipeline';
export const STREAMS_GET_PROCESSING_STEPS_TOOL_ID = 'streams.get_processing_steps';
export const STREAMS_SUGGEST_GROK_PATTERN_TOOL_ID = 'streams.suggest_grok_pattern';
export const STREAMS_SUGGEST_DISSECT_PATTERN_TOOL_ID = 'streams.suggest_dissect_pattern';
export const STREAMS_GET_STREAMLANG_DOCS_TOOL_ID = 'streams.get_streamlang_docs';
export const STREAMS_SIMULATE_PIPELINE_TOOL_ID = 'streams.simulate_pipeline';
