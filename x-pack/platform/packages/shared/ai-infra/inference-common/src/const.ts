/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticModelDictionary } from './types';
import { elasticModelIds } from './inference_endpoints';

/** Caps hung inference streams so Kibana terminates them with a typed error. */
export const MAX_STREAM_DURATION_MS = 5 * 60 * 1000;

/**
 * Default time to wait for response headers from an inference endpoint before the
 * request is failed with a retryable provider error (504).
 */
export const DEFAULT_FIRST_BYTE_TIMEOUT_MS = 120 * 1000;

/**
 * Default maximum silence between two chunks of an inference stream before the stream is
 * failed with a retryable provider error (504).
 */
export const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 120 * 1000;

export const elasticModelDictionary: ElasticModelDictionary = {
  [elasticModelIds.RainbowSprinkles]: {
    provider: 'bedrock',
    model: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
  },
};
