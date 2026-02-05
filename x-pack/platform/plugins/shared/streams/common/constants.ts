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
 * Characters that are not allowed in stream names.
 * These are the characters that Elasticsearch does not allow in index template/data stream names.
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-create-index.html#indices-create-api-path-params
 */
export const INVALID_STREAM_NAME_CHARACTERS = [' ', '"', '\\', '*', ',', '/', '<', '>', '?', '|'];

/**
 * Validates a stream name against Elasticsearch naming requirements.
 * Returns an error message if invalid, or undefined if valid.
 */
export const validateStreamName = (
  name: string
): { valid: true } | { valid: false; message: string } => {
  if (!name || name.length === 0) {
    return { valid: false, message: 'Stream name must not be empty.' };
  }

  if (name.length > MAX_STREAM_NAME_LENGTH) {
    return {
      valid: false,
      message: `Stream name cannot be longer than ${MAX_STREAM_NAME_LENGTH} characters.`,
    };
  }

  if (name !== name.toLowerCase()) {
    return { valid: false, message: 'Stream name cannot contain uppercase characters.' };
  }

  for (const char of INVALID_STREAM_NAME_CHARACTERS) {
    if (name.includes(char)) {
      const charDisplay = char === ' ' ? 'spaces' : `"${char}"`;
      return { valid: false, message: `Stream name cannot contain ${charDisplay}.` };
    }
  }

  return { valid: true };
};
