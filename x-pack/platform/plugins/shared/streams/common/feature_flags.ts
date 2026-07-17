/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Backward-compat exports for consumers that still import from `@kbn/streams-plugin/common`.
 * Canonical definitions live in `@kbn/significant-events-plugin/common/feature_flags`.
 */
export const STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG = 'streams.significantEventsAvailable';

export const STREAMS_SIGNIFICANT_EVENTS_SEMANTIC_CODE_SEARCH_GROUNDING_ENABLED_FLAG =
  'streams.significantEventsSemanticCodeSearchGroundingEnabled';
