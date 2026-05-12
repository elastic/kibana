/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeedbackLoaderService } from '../feedback_loader';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

describe('FeedbackLoaderService', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;
  let service: FeedbackLoaderService;

  beforeEach(() => {
    mockEsClient = {
      search: jest.fn(),
    } as unknown as jest.Mocked<ElasticsearchClient>;

    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    service = new FeedbackLoaderService(mockEsClient, mockLogger);
  });

  describe('loadRecentFeedback', () => {
    it('should load and aggregate feedback from recent cycles', async () => {
      const mockResponse = {
        hits: {
          hits: [
            {
              _source: {
                skill_id: 'skill-1',
                skill_name: 'Alert Triage',
                review: {
                  status: 'rejected',
                  rejection_reason: 'poor_quality',
                  feedback: 'Instructions too vague',
                },
                validation: { quality_score: 0.6 },
                created_at: '2024-01-01T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
            {
              _source: {
                skill_id: 'skill-2',
                skill_name: 'IP Enrichment',
                review: {
                  status: 'approved',
                },
                validation: { quality_score: 0.9 },
                created_at: '2024-01-02T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
            {
              _source: {
                skill_id: 'skill-3',
                skill_name: 'Duplicate Skill',
                review: {
                  status: 'rejected',
                  rejection_reason: 'overlaps_existing',
                  feedback: 'Overlaps with existing skill',
                },
                validation: { quality_score: 0.7 },
                created_at: '2024-01-03T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
          ],
        },
      };

      mockEsClient.search.mockResolvedValue(mockResponse as any);

      const result = await service.loadRecentFeedback(5);

      expect(result.total_rejected).toBe(2);
      expect(result.total_approved).toBe(1);
      expect(result.rejection_reasons).toEqual({
        poor_quality: 1,
        overlaps_existing: 1,
      });
    });

    it('should extract common issues correctly', async () => {
      const mockResponse = {
        hits: {
          hits: [
            {
              _source: {
                skill_id: 'skill-1',
                skill_name: 'Skill 1',
                review: { status: 'rejected', rejection_reason: 'poor_quality' },
                validation: { quality_score: 0.5 },
                created_at: '2024-01-01T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
            {
              _source: {
                skill_id: 'skill-2',
                skill_name: 'Skill 2',
                review: { status: 'rejected', rejection_reason: 'poor_quality' },
                validation: { quality_score: 0.6 },
                created_at: '2024-01-02T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
            {
              _source: {
                skill_id: 'skill-3',
                skill_name: 'Skill 3',
                review: { status: 'rejected', rejection_reason: 'not_useful' },
                validation: { quality_score: 0.7 },
                created_at: '2024-01-03T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
          ],
        },
      };

      mockEsClient.search.mockResolvedValue(mockResponse as any);

      const result = await service.loadRecentFeedback(5);

      expect(result.common_issues).toEqual([
        {
          category: 'Quality Issues',
          count: 2,
          examples: ['Skill 1', 'Skill 2'],
        },
        {
          category: 'Low Utility',
          count: 1,
          examples: ['Skill 3'],
        },
      ]);
    });

    it('should calculate approval trends by cycle', async () => {
      const mockResponse = {
        hits: {
          hits: [
            {
              _source: {
                skill_id: 'skill-1',
                skill_name: 'Skill 1',
                review: { status: 'approved' },
                validation: { quality_score: 0.9 },
                created_at: '2024-01-01T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
            {
              _source: {
                skill_id: 'skill-2',
                skill_name: 'Skill 2',
                review: { status: 'rejected', rejection_reason: 'poor_quality' },
                validation: { quality_score: 0.6 },
                created_at: '2024-01-02T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
            {
              _source: {
                skill_id: 'skill-3',
                skill_name: 'Skill 3',
                review: { status: 'approved' },
                validation: { quality_score: 0.95 },
                created_at: '2024-01-03T00:00:00Z',
                metadata: { cycle_number: 2 },
              },
            },
            {
              _source: {
                skill_id: 'skill-4',
                skill_name: 'Skill 4',
                review: { status: 'approved' },
                validation: { quality_score: 0.92 },
                created_at: '2024-01-04T00:00:00Z',
                metadata: { cycle_number: 2 },
              },
            },
          ],
        },
      };

      mockEsClient.search.mockResolvedValue(mockResponse as any);

      const result = await service.loadRecentFeedback(5);

      expect(result.approval_trends).toEqual([
        { cycle: 1, approval_rate: 50 },
        { cycle: 2, approval_rate: 100 },
      ]);
    });

    it('should generate recommendations based on feedback patterns', async () => {
      const mockResponse = {
        hits: {
          hits: [
            {
              _source: {
                skill_id: 'skill-1',
                skill_name: 'Skill 1',
                review: { status: 'rejected', rejection_reason: 'poor_quality' },
                validation: { quality_score: 0.5 },
                created_at: '2024-01-01T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
            {
              _source: {
                skill_id: 'skill-2',
                skill_name: 'Skill 2',
                review: { status: 'rejected', rejection_reason: 'poor_quality' },
                validation: { quality_score: 0.6 },
                created_at: '2024-01-02T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
            {
              _source: {
                skill_id: 'skill-3',
                skill_name: 'Skill 3',
                review: { status: 'rejected', rejection_reason: 'poor_quality' },
                validation: { quality_score: 0.55 },
                created_at: '2024-01-03T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
            {
              _source: {
                skill_id: 'skill-4',
                skill_name: 'Skill 4',
                review: { status: 'rejected', rejection_reason: 'poor_quality' },
                validation: { quality_score: 0.65 },
                created_at: '2024-01-04T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
          ],
        },
      };

      mockEsClient.search.mockResolvedValue(mockResponse as any);

      const result = await service.loadRecentFeedback(5);

      // Should increase min_confidence due to >3 poor_quality rejections
      expect(result.recommendations.min_confidence_threshold).toBeCloseTo(0.85, 5);
    });

    it('should handle multiple rejection reason types', async () => {
      const mockResponse = {
        hits: {
          hits: [
            {
              _source: {
                skill_id: 'skill-1',
                skill_name: 'Skill 1',
                review: { status: 'rejected', rejection_reason: 'not_useful' },
                validation: { quality_score: 0.7 },
                created_at: '2024-01-01T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
            {
              _source: {
                skill_id: 'skill-2',
                skill_name: 'Skill 2',
                review: { status: 'rejected', rejection_reason: 'not_useful' },
                validation: { quality_score: 0.75 },
                created_at: '2024-01-02T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
            {
              _source: {
                skill_id: 'skill-3',
                skill_name: 'Skill 3',
                review: { status: 'rejected', rejection_reason: 'not_useful' },
                validation: { quality_score: 0.72 },
                created_at: '2024-01-03T00:00:00Z',
                metadata: { cycle_number: 1 },
              },
            },
          ],
        },
      };

      mockEsClient.search.mockResolvedValue(mockResponse as any);

      const result = await service.loadRecentFeedback(5);

      // Should increase min_pattern_frequency due to >2 not_useful rejections
      expect(result.recommendations.min_pattern_frequency).toBe(20);
    });

    it('should return empty summary when no feedback exists', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [] },
      } as any);

      const result = await service.loadRecentFeedback(5);

      expect(result).toEqual({
        total_rejected: 0,
        total_approved: 0,
        rejection_reasons: {},
        common_issues: [],
        approval_trends: [],
        recommendations: {
          min_confidence_threshold: 0.8,
          min_pattern_frequency: 10,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Elasticsearch error');
      mockEsClient.search.mockRejectedValue(error);

      await expect(service.loadRecentFeedback(5)).rejects.toThrow('Elasticsearch error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AESOP Feedback] Failed to load feedback')
      );
    });
  });
});
