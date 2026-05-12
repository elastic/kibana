/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Feedback Loader Service
 *
 * Loads and analyzes rejection feedback from the .aesop-rejection-feedback index
 * to extract learning signals for improving future skill explorations.
 *
 * Learning signals:
 * - Adjust confidence thresholds
 * - Adjust pattern frequency thresholds
 * - Add exclusion patterns
 * - Refocus exploration areas
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export interface RejectionFeedback {
  skill_id: string;
  rejection_reason:
    | 'poor_quality'
    | 'overlaps_existing'
    | 'not_useful'
    | 'security_concern'
    | 'invalid_index_reference'
    | 'too_generic'
    | 'other';
  review_notes: string;
  timestamp: string;
  learning_signals?: {
    issue_type: string;
    suggested_fix: string;
  };
  skill_name?: string;
  skill_description?: string;
}

export interface FeedbackPatterns {
  topReasons: Array<{
    key: string;
    doc_count: number;
  }>;
  commonIssues: Array<{
    key: string;
    doc_count: number;
  }>;
}

export interface LearningSignals {
  increaseConfidenceThreshold: boolean;
  increaseFrequencyThreshold: boolean;
  excludePatterns: string[];
  focusAreas: string[];
  adjustedThresholds: {
    min_confidence?: number;
    min_pattern_frequency?: number;
  };
}

export class FeedbackLoaderService {
  constructor(private esClient: ElasticsearchClient) {}

  /**
   * Load rejection feedback from last N days
   */
  async loadRecentFeedback(days: number = 30): Promise<RejectionFeedback[]> {
    try {
      const result = await this.esClient.search<RejectionFeedback>({
        index: '.aesop-rejection-feedback',
        query: {
          range: {
            timestamp: {
              gte: `now-${days}d`,
            },
          },
        },
        size: 100,
        sort: [{ timestamp: 'desc' }],
      });

      return result.hits.hits.map((hit) => hit._source!);
    } catch (error) {
      // Index may not exist yet - return empty array
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Aggregate feedback by rejection reason
   */
  async aggregateFeedbackPatterns(): Promise<FeedbackPatterns> {
    try {
      const result = await this.esClient.search({
        index: '.aesop-rejection-feedback',
        size: 0,
        aggs: {
          by_reason: {
            terms: { field: 'rejection_reason', size: 10 },
          },
          common_issues: {
            terms: { field: 'learning_signals.issue_type.keyword', size: 10 },
          },
        },
      });

      return {
        topReasons: (result.aggregations?.by_reason as any)?.buckets || [],
        commonIssues: (result.aggregations?.common_issues as any)?.buckets || [],
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        return { topReasons: [], commonIssues: [] };
      }
      throw error;
    }
  }

  /**
   * Extract learning signals from feedback
   *
   * Analyzes feedback to determine parameter adjustments:
   * - If >3 "poor_quality" rejections → Increase confidence and frequency thresholds
   * - If >2 "not_useful" rejections → Increase frequency threshold
   * - If >2 "overlaps_existing" → Extract exclude patterns from skill names
   * - If any "security_concern" → Add security focus area
   * - If >3 "too_generic" → Add specific focus areas
   */
  extractLearningSignals(feedback: RejectionFeedback[]): LearningSignals {
    const signals: LearningSignals = {
      increaseConfidenceThreshold: false,
      increaseFrequencyThreshold: false,
      excludePatterns: [],
      focusAreas: [],
      adjustedThresholds: {},
    };

    if (feedback.length === 0) {
      return signals;
    }

    // Count rejection reasons
    const reasonCounts = feedback.reduce((acc, f) => {
      acc[f.rejection_reason] = (acc[f.rejection_reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // If >3 "poor_quality" rejections, increase thresholds
    if ((reasonCounts.poor_quality || 0) > 3) {
      signals.increaseConfidenceThreshold = true;
      signals.increaseFrequencyThreshold = true;
      signals.adjustedThresholds.min_confidence = 0.85;
      signals.adjustedThresholds.min_pattern_frequency = 15;
    }

    // If >2 "not_useful" rejections, increase frequency threshold
    if ((reasonCounts.not_useful || 0) > 2) {
      signals.increaseFrequencyThreshold = true;
      signals.adjustedThresholds.min_pattern_frequency = Math.max(
        signals.adjustedThresholds.min_pattern_frequency || 10,
        20
      );
    }

    // If >2 "overlaps_existing" rejections, extract exclude patterns
    if ((reasonCounts.overlaps_existing || 0) > 2) {
      const overlappingSkills = feedback
        .filter((f) => f.rejection_reason === 'overlaps_existing')
        .map((f) => f.skill_name || '')
        .filter(Boolean);

      // Extract common keywords from overlapping skill names
      const keywords = overlappingSkills.flatMap((name) =>
        name
          .toLowerCase()
          .split(/[-_\s]+/)
          .filter((word) => word.length > 3)
      );

      // Find most common keywords
      const keywordCounts = keywords.reduce((acc, keyword) => {
        acc[keyword] = (acc[keyword] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      signals.excludePatterns = Object.entries(keywordCounts)
        .filter(([_, count]) => count >= 2)
        .map(([keyword]) => keyword)
        .slice(0, 5);
    }

    // If any "security_concern" rejections, add security focus
    if ((reasonCounts.security_concern || 0) > 0) {
      signals.focusAreas.push('security_focused_patterns');
    }

    // If any "invalid_index_reference" rejections, add index resolution focus
    // Skills must reference data streams/aliases, never backing indices
    if ((reasonCounts.invalid_index_reference || 0) > 0) {
      signals.focusAreas.push('resolve_backing_indices_to_aliases');
    }

    // If >3 "too_generic" rejections, add specific focus areas
    if ((reasonCounts.too_generic || 0) > 3) {
      signals.focusAreas.push('high_frequency_patterns', 'specific_use_cases');
    }

    return signals;
  }

  /**
   * Store rejection feedback
   */
  async storeRejectionFeedback(feedback: Omit<RejectionFeedback, 'timestamp'>): Promise<void> {
    await this.esClient.index({
      index: '.aesop-rejection-feedback',
      document: {
        ...feedback,
        timestamp: new Date().toISOString(),
      },
      refresh: 'wait_for',
    });
  }
}

/**
 * Check if error is a "not found" error (index doesn't exist)
 */
function isNotFoundError(error: any): boolean {
  return (
    error?.statusCode === 404 ||
    error?.meta?.statusCode === 404 ||
    error?.body?.status === 404 ||
    error?.message?.includes('index_not_found')
  );
}
