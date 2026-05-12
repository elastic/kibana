/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Integration tests for AESOP feedback learning loop
 *
 * Tests the full cycle:
 * 1. Store rejection feedback
 * 2. Trigger new exploration
 * 3. Verify feedback loaded
 * 4. Verify parameters adjusted based on feedback
 * 5. Verify improved quality in next cycle
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { RejectionFeedback } from '../../../lib/aesop/learning';
import { FeedbackLoaderService } from '../../../lib/aesop/learning';

describe('AESOP Feedback Learning Integration', () => {
  let esClient: ElasticsearchClient;
  let feedbackLoader: FeedbackLoaderService;

  beforeEach(async () => {
    // Mock Elasticsearch client
    esClient = {
      search: jest.fn(),
      index: jest.fn(),
      delete: jest.fn(),
      deleteByQuery: jest.fn().mockResolvedValue({ deleted: 0 }),
    } as unknown as ElasticsearchClient;

    feedbackLoader = new FeedbackLoaderService(esClient);

    // Clear feedback index before each test
    await esClient.deleteByQuery({
      index: '.aesop-rejection-feedback',
      query: {
        match_all: {},
      },
      refresh: true,
    });
  });

  describe('Rejection Feedback Storage', () => {
    it('should store rejection feedback with timestamp', async () => {
      const feedback: Omit<RejectionFeedback, 'timestamp'> = {
        skill_id: 'skill-test-001',
        skill_name: 'Test Alert Triage',
        skill_description: 'Triages security alerts',
        rejection_reason: 'poor_quality',
        review_notes: 'Skill has low confidence scores',
        learning_signals: {
          issue_type: 'low_confidence',
          suggested_fix: 'Increase training data',
        },
      };

      await feedbackLoader.storeRejectionFeedback(feedback);

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.aesop-rejection-feedback',
          document: expect.objectContaining({
            ...feedback,
            timestamp: expect.any(String),
          }),
          refresh: 'wait_for',
        })
      );
    });
  });

  describe('Feedback Loading', () => {
    it('should load recent feedback from last 30 days', async () => {
      const mockFeedback: RejectionFeedback[] = [
        {
          skill_id: 'skill-001',
          skill_name: 'Alert Enrichment',
          rejection_reason: 'poor_quality',
          review_notes: 'Low confidence',
          timestamp: new Date().toISOString(),
        },
        {
          skill_id: 'skill-002',
          skill_name: 'Alert Correlation',
          rejection_reason: 'poor_quality',
          review_notes: 'Incomplete logic',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        },
      ];

      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: {
          total: { value: 2 },
          hits: mockFeedback.map((f) => ({ _source: f })),
        },
      });

      const result = await feedbackLoader.loadRecentFeedback(30);

      expect(result).toHaveLength(2);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.aesop-rejection-feedback',
          query: {
            range: {
              timestamp: {
                gte: 'now-30d',
              },
            },
          },
          size: 100,
          sort: [{ timestamp: 'desc' }],
        })
      );
    });

    it('should return empty array when feedback index does not exist', async () => {
      (esClient.search as jest.Mock).mockRejectedValueOnce({
        statusCode: 404,
        message: 'index_not_found_exception',
      });

      const result = await feedbackLoader.loadRecentFeedback(30);

      expect(result).toEqual([]);
    });
  });

  describe('Learning Signal Extraction', () => {
    it('should increase thresholds when >3 poor_quality rejections', () => {
      const feedback: RejectionFeedback[] = [
        {
          skill_id: 'skill-001',
          rejection_reason: 'poor_quality',
          review_notes: 'Test 1',
          timestamp: '2024-01-01T00:00:00Z',
        },
        {
          skill_id: 'skill-002',
          rejection_reason: 'poor_quality',
          review_notes: 'Test 2',
          timestamp: '2024-01-02T00:00:00Z',
        },
        {
          skill_id: 'skill-003',
          rejection_reason: 'poor_quality',
          review_notes: 'Test 3',
          timestamp: '2024-01-03T00:00:00Z',
        },
        {
          skill_id: 'skill-004',
          rejection_reason: 'poor_quality',
          review_notes: 'Test 4',
          timestamp: '2024-01-04T00:00:00Z',
        },
      ];

      const signals = feedbackLoader.extractLearningSignals(feedback);

      expect(signals.increaseConfidenceThreshold).toBe(true);
      expect(signals.increaseFrequencyThreshold).toBe(true);
      expect(signals.adjustedThresholds.min_confidence).toBe(0.85);
      expect(signals.adjustedThresholds.min_pattern_frequency).toBe(15);
    });

    it('should increase frequency threshold when >2 not_useful rejections', () => {
      const feedback: RejectionFeedback[] = [
        {
          skill_id: 'skill-001',
          rejection_reason: 'not_useful',
          review_notes: 'Not needed',
          timestamp: '2024-01-01T00:00:00Z',
        },
        {
          skill_id: 'skill-002',
          rejection_reason: 'not_useful',
          review_notes: 'Redundant',
          timestamp: '2024-01-02T00:00:00Z',
        },
        {
          skill_id: 'skill-003',
          rejection_reason: 'not_useful',
          review_notes: 'Low value',
          timestamp: '2024-01-03T00:00:00Z',
        },
      ];

      const signals = feedbackLoader.extractLearningSignals(feedback);

      expect(signals.increaseFrequencyThreshold).toBe(true);
      expect(signals.adjustedThresholds.min_pattern_frequency).toBe(20);
    });

    it('should extract exclude patterns from overlapping skills', () => {
      const feedback: RejectionFeedback[] = [
        {
          skill_id: 'skill-001',
          skill_name: 'alert-triage-helper',
          rejection_reason: 'overlaps_existing',
          review_notes: 'Duplicates existing triage skill',
          timestamp: '2024-01-01T00:00:00Z',
        },
        {
          skill_id: 'skill-002',
          skill_name: 'alert-triage-advanced',
          rejection_reason: 'overlaps_existing',
          review_notes: 'Similar to existing skill',
          timestamp: '2024-01-02T00:00:00Z',
        },
        {
          skill_id: 'skill-003',
          skill_name: 'enrichment-triage',
          rejection_reason: 'overlaps_existing',
          review_notes: 'Overlaps with triage',
          timestamp: '2024-01-03T00:00:00Z',
        },
      ];

      const signals = feedbackLoader.extractLearningSignals(feedback);

      expect(signals.excludePatterns).toContain('triage');
      expect(signals.excludePatterns.length).toBeGreaterThan(0);
    });

    it('should add security focus area when security_concern rejections exist', () => {
      const feedback: RejectionFeedback[] = [
        {
          skill_id: 'skill-001',
          rejection_reason: 'security_concern',
          review_notes: 'Potential data exposure',
          timestamp: '2024-01-01T00:00:00Z',
        },
      ];

      const signals = feedbackLoader.extractLearningSignals(feedback);

      expect(signals.focusAreas).toContain('security_focused_patterns');
    });

    it('should add specific focus areas when >3 too_generic rejections', () => {
      const feedback: RejectionFeedback[] = [
        {
          skill_id: 'skill-001',
          rejection_reason: 'too_generic',
          review_notes: 'Too broad',
          timestamp: '2024-01-01T00:00:00Z',
        },
        {
          skill_id: 'skill-002',
          rejection_reason: 'too_generic',
          review_notes: 'Not specific enough',
          timestamp: '2024-01-02T00:00:00Z',
        },
        {
          skill_id: 'skill-003',
          rejection_reason: 'too_generic',
          review_notes: 'Needs focus',
          timestamp: '2024-01-03T00:00:00Z',
        },
        {
          skill_id: 'skill-004',
          rejection_reason: 'too_generic',
          review_notes: 'Lacks specificity',
          timestamp: '2024-01-04T00:00:00Z',
        },
      ];

      const signals = feedbackLoader.extractLearningSignals(feedback);

      expect(signals.focusAreas).toContain('high_frequency_patterns');
      expect(signals.focusAreas).toContain('specific_use_cases');
    });

    it('should return default signals when no feedback available', () => {
      const signals = feedbackLoader.extractLearningSignals([]);

      expect(signals.increaseConfidenceThreshold).toBe(false);
      expect(signals.increaseFrequencyThreshold).toBe(false);
      expect(signals.excludePatterns).toEqual([]);
      expect(signals.focusAreas).toEqual([]);
      expect(signals.adjustedThresholds).toEqual({});
    });
  });

  describe('Feedback Pattern Aggregation', () => {
    it('should aggregate feedback by rejection reason', async () => {
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        aggregations: {
          by_reason: {
            buckets: [
              { key: 'poor_quality', doc_count: 5 },
              { key: 'not_useful', doc_count: 3 },
              { key: 'overlaps_existing', doc_count: 2 },
            ],
          },
          common_issues: {
            buckets: [
              { key: 'low_confidence', doc_count: 4 },
              { key: 'incomplete_logic', doc_count: 2 },
            ],
          },
        },
      });

      const patterns = await feedbackLoader.aggregateFeedbackPatterns();

      expect(patterns.topReasons).toHaveLength(3);
      expect(patterns.topReasons[0]).toEqual({ key: 'poor_quality', doc_count: 5 });
      expect(patterns.commonIssues).toHaveLength(2);
    });
  });

  describe('Full Feedback Loop Integration', () => {
    it('should complete full feedback learning cycle', async () => {
      // Step 1: Store rejection feedback
      const rejectionFeedback: Omit<RejectionFeedback, 'timestamp'> = {
        skill_id: 'skill-integration-001',
        skill_name: 'Alert Triage Helper',
        rejection_reason: 'poor_quality',
        review_notes: 'Low confidence scores, needs improvement',
        learning_signals: {
          issue_type: 'low_confidence',
          suggested_fix: 'Increase min_pattern_frequency threshold',
        },
      };

      await feedbackLoader.storeRejectionFeedback(rejectionFeedback);

      // Step 2: Load feedback in next exploration
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        hits: {
          total: { value: 4 },
          hits: [
            { _source: { ...rejectionFeedback, timestamp: new Date().toISOString() } },
            {
              _source: {
                skill_id: 'skill-002',
                rejection_reason: 'poor_quality',
                review_notes: 'Test 2',
                timestamp: new Date().toISOString(),
              },
            },
            {
              _source: {
                skill_id: 'skill-003',
                rejection_reason: 'poor_quality',
                review_notes: 'Test 3',
                timestamp: new Date().toISOString(),
              },
            },
            {
              _source: {
                skill_id: 'skill-004',
                rejection_reason: 'poor_quality',
                review_notes: 'Test 4',
                timestamp: new Date().toISOString(),
              },
            },
          ],
        },
      });

      const loadedFeedback = await feedbackLoader.loadRecentFeedback(30);

      // Step 3: Extract learning signals
      const signals = feedbackLoader.extractLearningSignals(loadedFeedback);

      // Step 4: Verify parameters adjusted
      expect(signals.increaseConfidenceThreshold).toBe(true);
      expect(signals.increaseFrequencyThreshold).toBe(true);
      expect(signals.adjustedThresholds.min_confidence).toBe(0.85);
      expect(signals.adjustedThresholds.min_pattern_frequency).toBe(15);

      // Step 5: Verify feedback was stored correctly
      expect(esClient.index).toHaveBeenCalledTimes(1);
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.aesop-rejection-feedback',
          document: expect.objectContaining({
            skill_id: 'skill-integration-001',
            rejection_reason: 'poor_quality',
          }),
        })
      );
    });
  });
});
