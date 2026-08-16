/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
import { isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import { parseDuration, parseDurationInSeconds } from './parse_duration';

/**
 * Numeric retention for table sorting. Infinity is reserved for known-indefinite
 * DSL (no data_retention). ILM and unparseable durations return NaN so they are
 * not ranked as keep-forever or as already-expired.
 */
export const lifecycleToRetentionMs = (
  lifecycle: IngestStreamEffectiveLifecycle | undefined
): number => {
  if (!lifecycle) {
    return 0;
  }

  if (isDslLifecycle(lifecycle)) {
    const dataRetention = lifecycle.dsl.data_retention;
    if (!dataRetention) {
      return Number.POSITIVE_INFINITY;
    }

    if (!parseDuration(dataRetention)) {
      return Number.NaN;
    }

    return parseDurationInSeconds(dataRetention) * 1000;
  }

  if (isIlmLifecycle(lifecycle)) {
    return Number.NaN;
  }

  return 0;
};
