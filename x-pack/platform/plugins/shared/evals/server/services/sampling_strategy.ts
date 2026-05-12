/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Sampling Strategy Service
 *
 * Determines adaptive sampling parameters for AESOP exploration based on
 * total data volume. Balances analysis depth with query performance.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { IndexInfo } from './index_discovery';

export interface SamplingConfig {
  sampleRate: number; // 0-1, fraction of documents to analyze
  strategyName: string; // Human-readable strategy name
  estimatedDocsSampled: number; // Approximate docs that will be analyzed
  depthLevel: 'light' | 'standard' | 'deep'; // Analysis depth
  description: string; // Explanation of why this strategy was chosen
}

/**
 * Calibrate sampling strategy based on total data volume.
 */
export async function calibrateSamplingStrategy(
  esClient: IScopedClusterClient,
  logger: Logger,
  indices: IndexInfo[]
): Promise<SamplingConfig> {
  logger.debug('[AESOP] Calibrating sampling strategy...');

  // Calculate total volume across all indices (last 7 days)
  let totalVolume = 0;

  for (const index of indices) {
    try {
      // Scope counts to the caller's RBAC — the index list fed in here was
      // already filtered through discoverIndices which also runs as the
      // current user, but re-asserting here guards against future callers
      // passing a broader list.
      const response = await esClient.asCurrentUser.count({
        index: index.name,
        query: {
          range: {
            '@timestamp': {
              gte: 'now-7d',
            },
          },
        },
      });

      totalVolume += response.count;
    } catch (error) {
      // If query fails, estimate from total doc count
      totalVolume += index.docCount * 0.1; // Assume 10% from last 7 days
    }
  }

  logger.debug(`[AESOP] Estimated 7-day volume: ${totalVolume.toLocaleString()} documents`);

  // Determine strategy based on volume
  let config: SamplingConfig;

  if (totalVolume < 10_000) {
    // Tiny dataset: analyze everything
    config = {
      sampleRate: 1.0,
      strategyName: 'Full Analysis',
      estimatedDocsSampled: totalVolume,
      depthLevel: 'deep',
      description:
        'Small dataset (<10K docs). Analyzing 100% of documents for comprehensive coverage.',
    };
  } else if (totalVolume < 100_000) {
    // Small to medium: stratified sampling at 30%
    config = {
      sampleRate: 0.3,
      strategyName: 'Stratified Sampling (30%)',
      estimatedDocsSampled: Math.floor(totalVolume * 0.3),
      depthLevel: 'standard',
      description:
        'Medium dataset (10K-100K docs). Stratified sampling of 30% to balance coverage and performance.',
    };
  } else if (totalVolume < 1_000_000) {
    // Medium to large: time-based sampling at 10%
    config = {
      sampleRate: 0.1,
      strategyName: 'Time-Based Sampling (10%)',
      estimatedDocsSampled: Math.floor(totalVolume * 0.1),
      depthLevel: 'standard',
      description: 'Large dataset (100K-1M docs). Time-based sampling of 10% for performance.',
    };
  } else if (totalVolume < 10_000_000) {
    // Large: sparse sampling at 1%
    config = {
      sampleRate: 0.01,
      strategyName: 'Sparse Sampling (1%)',
      estimatedDocsSampled: Math.floor(totalVolume * 0.01),
      depthLevel: 'light',
      description:
        'Very large dataset (1M-10M docs). Sparse sampling of 1% to maintain response times.',
    };
  } else {
    // Huge: minimal sampling at 0.1%
    config = {
      sampleRate: 0.001,
      strategyName: 'Minimal Sampling (0.1%)',
      estimatedDocsSampled: Math.floor(totalVolume * 0.001),
      depthLevel: 'light',
      description:
        'Huge dataset (>10M docs). Minimal sampling of 0.1% with focus on high-signal patterns only.',
    };
  }

  logger.info(
    `[AESOP] Sampling strategy: ${
      config.strategyName
    } (${totalVolume.toLocaleString()} docs → ${config.estimatedDocsSampled.toLocaleString()} sampled)`
  );

  return config;
}

/**
 * Apply sampling rate to an Elasticsearch query (for use in exploration).
 */
export function applySampling(query: any, sampleRate: number): any {
  if (sampleRate >= 1.0) {
    // No sampling needed
    return query;
  }

  if (sampleRate === 0) {
    // No data
    return { match_none: {} };
  }

  // Use random_score to sample
  return {
    bool: {
      must: query,
      // Random score filters to approximately match sample rate
      filter: [
        {
          script: {
            script: {
              source: `Math.random() < ${sampleRate}`,
            },
          },
        },
      ],
    },
  };
}

/**
 * Get analysis parameters based on depth level.
 */
export function getDepthParameters(depth: 'light' | 'standard' | 'deep') {
  const params: Record<
    'light' | 'standard' | 'deep',
    {
      maxPatterns: number;
      minOccurrences: number;
      correlationDepth: number;
      windowSize: string;
    }
  > = {
    light: {
      maxPatterns: 5, // Find only top 5 patterns
      minOccurrences: 100, // Require 100+ occurrences
      correlationDepth: 1, // Single-level correlations only
      windowSize: '1d', // 1-day time windows
    },
    standard: {
      maxPatterns: 20, // Find top 20 patterns
      minOccurrences: 50, // Require 50+ occurrences
      correlationDepth: 2, // Multi-level correlations
      windowSize: '12h', // 12-hour time windows
    },
    deep: {
      maxPatterns: 100, // Find top 100 patterns
      minOccurrences: 10, // Require 10+ occurrences
      correlationDepth: 3, // Deep multi-level correlations
      windowSize: '1h', // 1-hour time windows
    },
  };

  return params[depth];
}
