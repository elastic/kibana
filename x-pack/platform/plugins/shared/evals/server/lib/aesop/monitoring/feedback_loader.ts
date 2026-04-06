/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Feedback Loader Service
 *
 * Loads historical feedback from previous exploration cycles to inform the current run.
 * This is used in Phase 0 of the exploration workflow to:
 * - Avoid repeating past mistakes
 * - Apply learned improvements
 * - Adjust exploration parameters based on historical patterns
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export interface FeedbackRecord {
  skill_id: string;
  skill_name: string;
  review_status: 'approved' | 'rejected';
  rejection_reason?: string;
  reviewer_feedback?: string;
  quality_score?: number;
  created_at: string;
  cycle_number?: number;
}

export interface FeedbackSummary {
  total_rejected: number;
  total_approved: number;
  rejection_reasons: Record<string, number>;
  common_issues: Array<{
    category: string;
    count: number;
    examples: string[];
  }>;
  approval_trends: Array<{
    cycle: number;
    approval_rate: number;
  }>;
  recommendations: {
    min_confidence_threshold?: number;
    min_pattern_frequency?: number;
    exclude_patterns?: string[];
    focus_areas?: string[];
  };
}

export class FeedbackLoaderService {
  constructor(private esClient: ElasticsearchClient, private logger: Logger) {}

  /**
   * Load feedback from recent exploration cycles
   *
   * @param cycleWindow - Number of recent cycles to analyze (default: 5)
   * @returns Aggregated feedback summary with recommendations
   */
  async loadRecentFeedback(cycleWindow: number = 5): Promise<FeedbackSummary> {
    this.logger.debug(`[AESOP Feedback] Loading recent feedback cycleWindow=${cycleWindow}`);

    try {
      // Query .aesop-proposed-skills for feedback records
      const result = await this.esClient.search({
        index: '.aesop-proposed-skills',
        size: 500, // Load up to 500 recent skills
        sort: [{ created_at: { order: 'desc' } }],
        query: {
          bool: {
            must: [
              {
                terms: {
                  'review.status': ['approved', 'rejected'],
                },
              },
            ],
          },
        },
        _source: [
          'skill_id',
          'skill_name',
          'review.status',
          'review.rejection_reason',
          'review.feedback',
          'validation.quality_score',
          'created_at',
          'metadata.cycle_number',
        ],
      });

      const hits = result.hits.hits;

      if (hits.length === 0) {
        this.logger.info('[AESOP Feedback] No historical feedback found');
        return this.getEmptySummary();
      }

      // Extract feedback records
      const feedbackRecords: FeedbackRecord[] = hits.map((hit: any) => {
        const source = hit._source;
        return {
          skill_id: source.skill_id,
          skill_name: source.skill_name,
          review_status: source.review?.status,
          rejection_reason: source.review?.rejection_reason,
          reviewer_feedback: source.review?.feedback,
          quality_score: source.validation?.quality_score,
          created_at: source.created_at,
          cycle_number: source.metadata?.cycle_number,
        };
      });

      // Aggregate rejection reasons
      const rejectionReasons: Record<string, number> = {};
      const rejectedRecords = feedbackRecords.filter((r) => r.review_status === 'rejected');

      rejectedRecords.forEach((record) => {
        if (record.rejection_reason) {
          rejectionReasons[record.rejection_reason] =
            (rejectionReasons[record.rejection_reason] || 0) + 1;
        }
      });

      // Identify common issues
      const commonIssues = this.extractCommonIssues(feedbackRecords);

      // Calculate approval trends by cycle
      const approvalTrends = this.calculateApprovalTrends(feedbackRecords);

      // Generate recommendations based on feedback patterns
      const recommendations = this.generateRecommendations(rejectionReasons, feedbackRecords);

      const summary: FeedbackSummary = {
        total_rejected: rejectedRecords.length,
        total_approved: feedbackRecords.filter((r) => r.review_status === 'approved').length,
        rejection_reasons: rejectionReasons,
        common_issues: commonIssues,
        approval_trends: approvalTrends,
        recommendations,
      };

      this.logger.info(
        `[AESOP Feedback] ✅ Feedback loaded successfully total_records=${feedbackRecords.length} total_rejected=${summary.total_rejected} total_approved=${summary.total_approved}`
      );

      return summary;
    } catch (error) {
      this.logger.error(
        `[AESOP Feedback] Failed to load feedback error=${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Extract common issues from feedback
   */
  private extractCommonIssues(
    records: FeedbackRecord[]
  ): Array<{ category: string; count: number; examples: string[] }> {
    const issueMap = new Map<
      string,
      {
        count: number;
        examples: string[];
      }
    >();

    // Categorize rejection reasons
    const categoryMapping: Record<string, string> = {
      poor_quality: 'Quality Issues',
      overlaps_existing: 'Overlap/Duplication',
      not_useful: 'Low Utility',
      security_concern: 'Security Concerns',
      too_generic: 'Too Generic',
      missing_context: 'Missing Context',
      incorrect_tool_usage: 'Tool Usage Issues',
    };

    records.forEach((record) => {
      if (record.review_status === 'rejected' && record.rejection_reason) {
        const category = categoryMapping[record.rejection_reason] || 'Other';
        const existing = issueMap.get(category) || { count: 0, examples: [] };

        existing.count += 1;
        if (existing.examples.length < 5) {
          existing.examples.push(record.skill_name);
        }

        issueMap.set(category, existing);
      }
    });

    return Array.from(issueMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        examples: data.examples,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate approval rate trends by cycle
   */
  private calculateApprovalTrends(
    records: FeedbackRecord[]
  ): Array<{ cycle: number; approval_rate: number }> {
    const cycleMap = new Map<number, { approved: number; total: number }>();

    records.forEach((record) => {
      const cycle = record.cycle_number || 0;
      const existing = cycleMap.get(cycle) || { approved: 0, total: 0 };

      existing.total += 1;
      if (record.review_status === 'approved') {
        existing.approved += 1;
      }

      cycleMap.set(cycle, existing);
    });

    return Array.from(cycleMap.entries())
      .map(([cycle, data]) => ({
        cycle,
        approval_rate: data.total > 0 ? (data.approved / data.total) * 100 : 0,
      }))
      .sort((a, b) => a.cycle - b.cycle);
  }

  /**
   * Generate recommendations based on feedback patterns
   */
  private generateRecommendations(
    rejectionReasons: Record<string, number>,
    records: FeedbackRecord[]
  ): FeedbackSummary['recommendations'] {
    const recommendations: FeedbackSummary['recommendations'] = {};

    // Default thresholds
    let minConfidence = 0.8;
    let minPatternFrequency = 10;
    const excludePatterns: string[] = [];
    const focusAreas: string[] = [];

    // Adjust based on rejection patterns
    const poorQualityCount = rejectionReasons.poor_quality || 0;
    const notUsefulCount = rejectionReasons.not_useful || 0;
    const overlapsCount = rejectionReasons.overlaps_existing || 0;
    const tooGenericCount = rejectionReasons.too_generic || 0;

    // Rule 1: If >3 poor quality rejections, increase min_confidence
    if (poorQualityCount > 3) {
      minConfidence += 0.05;
      this.logger.debug(
        `[AESOP Feedback] Increasing min_confidence due to poor quality count=${poorQualityCount}`
      );
    }

    // Rule 2: If >2 not useful rejections, increase min_pattern_frequency
    if (notUsefulCount > 2) {
      minPatternFrequency += 10;
      this.logger.debug(
        `[AESOP Feedback] Increasing min_pattern_frequency due to low utility count=${notUsefulCount}`
      );
    }

    // Rule 3: If >2 overlaps, add exclude patterns
    if (overlapsCount > 2) {
      const overlappingSkills = records
        .filter((r) => r.rejection_reason === 'overlaps_existing')
        .map((r) => r.skill_name)
        .slice(0, 5);

      excludePatterns.push(...overlappingSkills);
      this.logger.debug(
        `[AESOP Feedback] Adding exclude patterns due to overlaps count=${overlapsCount} patterns=${overlappingSkills.join(
          ','
        )}`
      );
    }

    // Rule 4: If >3 too generic, add focus areas
    if (tooGenericCount > 3) {
      focusAreas.push('high_specificity', 'concrete_use_cases');
      this.logger.debug(
        `[AESOP Feedback] Adding focus areas due to generic skills count=${tooGenericCount}`
      );
    }

    recommendations.min_confidence_threshold = minConfidence;
    recommendations.min_pattern_frequency = minPatternFrequency;

    if (excludePatterns.length > 0) {
      recommendations.exclude_patterns = excludePatterns;
    }

    if (focusAreas.length > 0) {
      recommendations.focus_areas = focusAreas;
    }

    return recommendations;
  }

  /**
   * Get empty summary (no feedback available)
   */
  private getEmptySummary(): FeedbackSummary {
    return {
      total_rejected: 0,
      total_approved: 0,
      rejection_reasons: {},
      common_issues: [],
      approval_trends: [],
      recommendations: {
        min_confidence_threshold: 0.8,
        min_pattern_frequency: 10,
      },
    };
  }
}
