/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { discoverMessagePatterns } from '../../../../routes/utils/discover_message_patterns';

export const MAX_DISCOVERED_PATTERNS = 500;

export const MIN_NEW_PATTERNS = 2;

/**
 * Maximum number of patterns sent as `must_not` exclusions to ES.
 * The first patterns in the list (highest-frequency after each reset)
 * are selected so that the exclusion removes the most documents and
 * maximises the `random_sampler` probability boost.
 */
export const MAX_EXCLUSION_PATTERNS = 50;

/** Target number of sample documents to return for feature identification. */
const DEFAULT_SAMPLE_SIZE = 20;

/**
 * Discovers new log-message categories using a hybrid strategy:
 *
 * 1. The first {@link MAX_EXCLUSION_PATTERNS} known patterns (highest-frequency)
 *    are sent as `must_not` exclusions to boost the `random_sampler` probability.
 * 2. `categorize_text` is over-requested to cover non-excluded known patterns
 *    plus the desired number of new categories.
 * 3. Returned categories are filtered client-side against all known patterns
 *    to extract truly new ones.
 * 4. If fewer than {@link MIN_NEW_PATTERNS} new categories are found the
 *    pattern set is reset.
 */
export const getSampleDocuments = async ({
  esClient,
  index,
  start,
  end,
  discoveredPatterns,
  lastPatternResetAt,
  size = DEFAULT_SAMPLE_SIZE,
}: {
  esClient: ElasticsearchClient;
  index: string;
  start: number;
  end: number;
  discoveredPatterns: string[];
  lastPatternResetAt: number;
  size?: number;
}): Promise<{
  updatedPatterns: string[];
  lastPatternResetAt: number;
  sampleDocuments: Array<Record<string, unknown>>;
}> => {
  const knownSet = new Set(discoveredPatterns);

  // First N patterns (highest-frequency after reset) go into must_not
  const excludePatterns = discoveredPatterns.slice(0, MAX_EXCLUSION_PATTERNS);
  const nonExcludedKnownCount = Math.max(0, knownSet.size - excludePatterns.length);

  // Over-request: enough room for non-excluded known patterns + desired new ones
  const categorySize = Math.max(size, nonExcludedKnownCount + size);

  const { categories, randomSampleDocuments } = await discoverMessagePatterns({
    esClient,
    index,
    start,
    end,
    excludePatterns: excludePatterns.length > 0 ? excludePatterns : undefined,
    sampleSize: size,
    categorySize,
  });

  const newCategories = categories.filter((c) => !knownSet.has(c.pattern));
  const categoryDocuments = newCategories.flatMap((c) => c.sampleDocuments);
  const sampleDocuments = [
    ...categoryDocuments,
    ...randomSampleDocuments.slice(0, Math.max(0, size - categoryDocuments.length)),
  ].slice(0, size);

  const newPatterns = newCategories.filter((c) => c.isMeaningfulPattern).map((c) => c.pattern);

  const shouldReset = newPatterns.length < MIN_NEW_PATTERNS;

  return {
    updatedPatterns: shouldReset
      ? []
      : [...discoveredPatterns, ...newPatterns].slice(0, MAX_DISCOVERED_PATTERNS),
    lastPatternResetAt: shouldReset ? Date.now() : lastPatternResetAt,
    sampleDocuments,
  };
};
