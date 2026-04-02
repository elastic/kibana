/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SkillMonitoringService } from './skill_monitoring_service';

describe('SkillMonitoringService', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  let service: SkillMonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SkillMonitoringService(logger);
  });

  describe('getSkillMetrics', () => {
    it('returns aggregated usage, feedback, quality, and alerts', async () => {
      // Usage query
      esClient.search.mockResolvedValueOnce({
        aggregations: {
          total_invocations: { value: 150 },
          unique_agents: { value: 5 },
          unique_users: { value: 12 },
          per_day: {
            buckets: [
              { key_as_string: '2025-06-01', doc_count: 50 },
              { key_as_string: '2025-06-02', doc_count: 60 },
              { key_as_string: '2025-06-03', doc_count: 40 },
            ],
          },
        },
      } as any);

      // Feedback query
      esClient.search.mockResolvedValueOnce({
        aggregations: {
          feedback_breakdown: {
            buckets: [
              { key: 'positive', doc_count: 80 },
              { key: 'negative', doc_count: 20 },
            ],
          },
        },
      } as any);

      // Deployment score query (quality)
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _source: { score: 0.85, '@timestamp': '2025-06-01T00:00:00Z' } }],
        },
      } as any);

      // Latest drift-check score query
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _source: { score: 0.82, '@timestamp': '2025-06-03T00:00:00Z' } }],
        },
      } as any);

      // Latest evaluation timestamp query
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _source: { '@timestamp': '2025-06-03T12:00:00Z' } }],
        },
      } as any);

      const metrics = await service.getSkillMetrics(
        'skill-1',
        'Test Skill',
        '2025-06-01T00:00:00Z',
        { from: '2025-06-01T00:00:00Z', to: '2025-06-03T23:59:59Z' },
        esClient
      );

      expect(metrics.skill_id).toBe('skill-1');
      expect(metrics.skill_name).toBe('Test Skill');
      expect(metrics.usage.total_invocations).toBe(150);
      expect(metrics.usage.unique_agents).toBe(5);
      expect(metrics.usage.unique_users).toBe(12);
      expect(metrics.usage.invocations_per_day).toHaveLength(3);
      expect(metrics.success.success_rate).toBe(0.8);
      expect(metrics.success.positive_feedback).toBe(80);
      expect(metrics.success.negative_feedback).toBe(20);
      expect(metrics.quality.deployment_score).toBe(0.85);
      expect(metrics.quality.current_score).toBe(0.82);
    });

    it('returns zero values when ES returns empty aggregations', async () => {
      // Usage query — no aggs
      esClient.search.mockResolvedValueOnce({
        aggregations: {
          total_invocations: { value: 0 },
          unique_agents: { value: 0 },
          unique_users: { value: 0 },
          per_day: { buckets: [] },
        },
      } as any);

      // Feedback query — no buckets
      esClient.search.mockResolvedValueOnce({
        aggregations: {
          feedback_breakdown: { buckets: [] },
        },
      } as any);

      // Deployment score — no hits
      esClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      } as any);

      // Latest drift-check — no hits
      esClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      } as any);

      // Latest evaluation — no hits
      esClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      } as any);

      const metrics = await service.getSkillMetrics(
        'skill-empty',
        'Empty',
        '2025-06-01T00:00:00Z',
        { from: '2025-06-01T00:00:00Z', to: '2025-06-03T23:59:59Z' },
        esClient
      );

      expect(metrics.usage.total_invocations).toBe(0);
      expect(metrics.success.success_rate).toBe(0);
      expect(metrics.quality.current_score).toBeNull();
      expect(metrics.quality.score_delta).toBeNull();
      expect(metrics.quality.drift_detected).toBe(false);
    });

    it('generates a low_usage alert when there are no invocations', async () => {
      esClient.search.mockResolvedValueOnce({
        aggregations: {
          total_invocations: { value: 0 },
          unique_agents: { value: 0 },
          unique_users: { value: 0 },
          per_day: { buckets: [] },
        },
      } as any);

      esClient.search.mockResolvedValueOnce({
        aggregations: { feedback_breakdown: { buckets: [] } },
      } as any);

      esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);
      esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);
      esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

      const metrics = await service.getSkillMetrics(
        'skill-idle',
        'Idle',
        '2025-06-01T00:00:00Z',
        { from: '2025-06-01T00:00:00Z', to: '2025-06-03T23:59:59Z' },
        esClient
      );

      expect(metrics.alerts.some((a) => a.type === 'low_usage')).toBe(true);
    });
  });

  describe('detectDrift', () => {
    it('detects drift when current score drops below threshold', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _source: { score: 0.65, '@timestamp': '2025-06-03T00:00:00Z' } }],
        },
      } as any);

      const result = await service.detectDrift('skill-1', 0.85, esClient, {
        threshold: 0.1,
        evaluationInterval: '24h',
        enabled: true,
      });

      expect(result.driftDetected).toBe(true);
      expect(result.currentScore).toBe(0.65);
      expect(result.delta).toBe(-0.19999999999999996);
    });

    it('returns no drift when score is within threshold', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _source: { score: 0.82, '@timestamp': '2025-06-03T00:00:00Z' } }],
        },
      } as any);

      const result = await service.detectDrift('skill-1', 0.85, esClient, {
        threshold: 0.1,
        evaluationInterval: '24h',
        enabled: true,
      });

      expect(result.driftDetected).toBe(false);
      expect(result.currentScore).toBe(0.82);
    });

    it('returns no drift when disabled', async () => {
      const result = await service.detectDrift('skill-1', 0.85, esClient, {
        threshold: 0.1,
        evaluationInterval: '24h',
        enabled: false,
      });

      expect(result.driftDetected).toBe(false);
      expect(result.currentScore).toBeNull();
      expect(result.delta).toBeNull();
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('returns null score when no evaluations exist', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      } as any);

      const result = await service.detectDrift('skill-1', 0.85, esClient, {
        threshold: 0.1,
        evaluationInterval: '24h',
        enabled: true,
      });

      expect(result.driftDetected).toBe(false);
      expect(result.currentScore).toBeNull();
      expect(result.delta).toBeNull();
    });
  });
});
