/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsCollectorService } from '../metrics_collector';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

describe('MetricsCollectorService', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;
  let service: MetricsCollectorService;

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

    service = new MetricsCollectorService(mockEsClient, mockLogger);
  });

  describe('collectSkillUsageMetrics', () => {
    it('should collect skill usage metrics from traces', async () => {
      const mockResponse = {
        aggregations: {
          by_skill: {
            buckets: [
              {
                key: 'skill-1',
                doc_count: 100,
                skill_name: { buckets: [{ key: 'Alert Triage' }] },
                success_count: { doc_count: 95 },
                avg_duration: { value: 2500 },
                p95_duration: { values: { '95.0': 4000 } },
                total_prompt_tokens: { value: 50000 },
                total_completion_tokens: { value: 15000 },
                cached_tokens: { value: 10000 },
                error_count: { doc_count: 5 },
              },
            ],
          },
          total_invocations: { value: 100 },
          total_tokens_sum: { value: 65000 },
        },
      };

      mockEsClient.search.mockResolvedValue(mockResponse as any);

      const result = await service.collectSkillUsageMetrics({
        from: 'now-7d',
        to: 'now',
      });

      expect(result.by_skill).toHaveLength(1);
      expect(result.by_skill[0]).toEqual({
        skill_id: 'skill-1',
        skill_name: 'Alert Triage',
        invocations: 100,
        success_rate: 95,
        avg_duration_ms: 2500,
        p95_duration_ms: 4000,
        total_tokens: 65000,
        avg_tokens_per_call: 650,
        cached_tokens: 10000,
        cache_hit_rate: 20,
        error_count: 5,
      });

      expect(result.totals.total_invocations).toBe(100);
      expect(result.totals.total_tokens).toBe(65000);
      expect(result.totals.avg_success_rate).toBe(95);
    });

    it('should calculate cost correctly', async () => {
      const mockResponse = {
        aggregations: {
          by_skill: {
            buckets: [
              {
                key: 'skill-1',
                doc_count: 1,
                skill_name: { buckets: [{ key: 'Test' }] },
                success_count: { doc_count: 1 },
                avg_duration: { value: 1000 },
                p95_duration: { values: { '95.0': 1000 } },
                total_prompt_tokens: { value: 1000 },
                total_completion_tokens: { value: 500 },
                total_tokens: { value: 1500 },
                cached_tokens: { value: 0 },
                error_count: { doc_count: 0 },
              },
            ],
          },
          total_invocations: { value: 1 },
          total_tokens_sum: { value: 1500 },
        },
      };

      mockEsClient.search.mockResolvedValue(mockResponse as any);

      const result = await service.collectSkillUsageMetrics({
        from: 'now-1d',
        to: 'now',
      });

      // Cost calculation: (1000 * 0.003)/1000 + (500 * 0.015)/1000 = 0.0105
      expect(result.totals.total_cost_usd).toBeCloseTo(0.0105, 4);
    });

    it('should handle empty results', async () => {
      mockEsClient.search.mockResolvedValue({
        aggregations: {
          by_skill: { buckets: [] },
          total_invocations: { value: 0 },
          total_tokens_sum: { value: 0 },
        },
      } as any);

      const result = await service.collectSkillUsageMetrics({
        from: 'now-7d',
        to: 'now',
      });

      expect(result.by_skill).toHaveLength(0);
      expect(result.totals.total_invocations).toBe(0);
      expect(result.totals.total_cost_usd).toBe(0);
    });
  });

  describe('collectApprovalRateMetrics', () => {
    it('should collect approval rate metrics by cycle', async () => {
      const mockResponse = {
        aggregations: {
          by_cycle: {
            buckets: [
              {
                key: 1,
                total_skills: { value: 10 },
                approved_count: { doc_count: 6 },
                rejected_count: { doc_count: 3 },
                pending_count: { doc_count: 1 },
                avg_quality: { value: 0.75 },
              },
              {
                key: 2,
                total_skills: { value: 8 },
                approved_count: { doc_count: 7 },
                rejected_count: { doc_count: 1 },
                pending_count: { doc_count: 0 },
                avg_quality: { value: 0.85 },
              },
            ],
          },
          total_skills_count: { value: 18 },
          total_approved_count: { doc_count: 13 },
        },
      };

      mockEsClient.search.mockResolvedValue(mockResponse as any);

      const result = await service.collectApprovalRateMetrics();

      expect(result.by_cycle).toHaveLength(2);
      expect(result.by_cycle[0]).toEqual({
        cycle_number: 1,
        total_skills: 10,
        approved_skills: 6,
        rejected_skills: 3,
        pending_skills: 1,
        approval_rate: 60,
        avg_quality_score: 0.75,
        improvement_from_previous: null,
      });

      expect(result.by_cycle[1]).toEqual({
        cycle_number: 2,
        total_skills: 8,
        approved_skills: 7,
        rejected_skills: 1,
        pending_skills: 0,
        approval_rate: 87.5,
        avg_quality_score: 0.85,
        improvement_from_previous: 27.5,
      });

      expect(result.overall.total_skills_proposed).toBe(18);
      expect(result.overall.total_approved).toBe(13);
      expect(result.overall.overall_approval_rate).toBeCloseTo(72.22, 2);
    });

    it('should determine trend correctly', async () => {
      const mockResponse = {
        aggregations: {
          by_cycle: {
            buckets: [
              {
                key: 1,
                total_skills: { value: 10 },
                approved_count: { doc_count: 5 },
                rejected_count: { doc_count: 5 },
                pending_count: { doc_count: 0 },
                avg_quality: { value: 0.7 },
              },
              {
                key: 2,
                total_skills: { value: 10 },
                approved_count: { doc_count: 7 },
                rejected_count: { doc_count: 3 },
                pending_count: { doc_count: 0 },
                avg_quality: { value: 0.8 },
              },
              {
                key: 3,
                total_skills: { value: 10 },
                approved_count: { doc_count: 9 },
                rejected_count: { doc_count: 1 },
                pending_count: { doc_count: 0 },
                avg_quality: { value: 0.9 },
              },
            ],
          },
          total_skills_count: { value: 30 },
          total_approved_count: { doc_count: 21 },
        },
      };

      mockEsClient.search.mockResolvedValue(mockResponse as any);

      const result = await service.collectApprovalRateMetrics();

      expect(result.overall.trend).toBe('improving');
    });
  });

  describe('collectExplorationPerformance', () => {
    it('should collect exploration metrics', async () => {
      const mockResponse = {
        hits: {
          total: 5,
          hits: [
            {
              _source: {
                execution_id: 'exec-1',
                started_at: '2024-01-01T00:00:00Z',
                completed_at: '2024-01-01T00:15:00Z',
                duration_ms: 900000,
                metrics: {
                  indices_discovered: 50,
                  relationships_found: 20,
                  patterns_identified: 10,
                  skills_proposed: 5,
                },
                input: { agent_role: 'SOC analyst' },
              },
            },
          ],
        },
      };

      mockEsClient.search.mockResolvedValue(mockResponse as any);

      const result = await service.collectExplorationPerformance();

      expect(result.by_execution).toHaveLength(1);
      expect(result.by_execution[0]).toEqual({
        execution_id: 'exec-1',
        started_at: '2024-01-01T00:00:00Z',
        completed_at: '2024-01-01T00:15:00Z',
        duration_minutes: 15,
        indices_discovered: 50,
        relationships_found: 20,
        patterns_identified: 10,
        skills_proposed: 5,
        agent_role: 'SOC analyst',
      });

      expect(result.aggregates.success_rate).toBe(100);
    });
  });

  describe('collectTokenUsageByAgent', () => {
    it('should collect token usage by agent', async () => {
      const mockResponse = {
        aggregations: {
          by_agent: {
            buckets: [
              {
                key: 'aesop.schema_categorizer',
                agent_name: { buckets: [{ key: 'Schema Categorizer' }] },
                invocations: { value: 10 },
                total_prompt_tokens: { value: 5000 },
                total_completion_tokens: { value: 2000 },
                total_tokens: { value: 7000 },
                cached_tokens: { value: 1000 },
              },
            ],
          },
          total_invocations_all: { value: 10 },
          total_cached_tokens_all: { value: 1000 },
        },
      };

      mockEsClient.search.mockResolvedValue(mockResponse as any);

      const result = await service.collectTokenUsageByAgent({
        from: 'now-7d',
        to: 'now',
      });

      expect(result.by_agent).toHaveLength(1);
      expect(result.by_agent[0]).toMatchObject({
        agent_id: 'aesop.schema_categorizer',
        agent_name: 'Schema Categorizer',
        invocations: 10,
        total_tokens: 7000,
        avg_tokens_per_call: 700,
        cached_tokens: 1000,
        cache_hit_rate: 20,
      });

      expect(result.totals.total_invocations).toBe(10);
      expect(result.totals.total_tokens).toBe(7000);
    });
  });
});
