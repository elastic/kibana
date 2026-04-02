/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import { API_VERSIONS, EVALS_INTERNAL_URL } from '@kbn/evals-common';
import { EvaluatorRegistry } from '../../lib/evaluation_engine';
import { SkillMonitoringService } from '../../lib/monitoring/skill_monitoring_service';
import { registerGetSkillMetricsRoute } from './get_skill_metrics';

const EVALS_SKILL_METRICS_URL = `${EVALS_INTERNAL_URL}/skills/{skillId}/metrics`;

describe('GET /internal/evals/skills/{skillId}/metrics', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const evaluatorRegistry = new EvaluatorRegistry(logger);
    const monitoringService = new SkillMonitoringService(logger);

    registerGetSkillMetricsRoute({ router, logger, evaluatorRegistry, monitoringService });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_SKILL_METRICS_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const mockCoreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: mockCoreContext });
    const esClient = mockCoreContext.elasticsearch.client.asCurrentUser;

    return { handler, context, esClient, logger, monitoringService };
  };

  it('returns skill metrics from the monitoring service', async () => {
    const { handler, context, esClient } = setup();

    // Mock usage aggregations
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        total_invocations: { value: 42 },
        unique_agents: { value: 3 },
        unique_users: { value: 7 },
        per_day: {
          buckets: [{ key_as_string: '2025-06-01', doc_count: 42 }],
        },
      },
    } as any);

    // Mock feedback
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        feedback_breakdown: {
          buckets: [
            { key: 'positive', doc_count: 30 },
            { key: 'negative', doc_count: 5 },
          ],
        },
      },
    } as any);

    // Mock deployment score
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: { score: 0.9, '@timestamp': '2025-06-01T00:00:00Z' } }] },
    } as any);

    // Mock latest drift-check score
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: { score: 0.88, '@timestamp': '2025-06-02T00:00:00Z' } }] },
    } as any);

    // Mock latest evaluation timestamp
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: { '@timestamp': '2025-06-02T00:00:00Z' } }] },
    } as any);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_SKILL_METRICS_URL.replace('{skillId}', 'skill-abc'),
      params: { skillId: 'skill-abc' },
      query: {
        from: '2025-06-01T00:00:00Z',
        to: '2025-06-07T23:59:59Z',
      },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.skill_id).toBe('skill-abc');
    expect(response.payload.usage.total_invocations).toBe(42);
    expect(response.payload.usage.unique_agents).toBe(3);
    expect(response.payload.success.positive_feedback).toBe(30);
    expect(response.payload.quality.deployment_score).toBe(0.9);
  });

  it('returns 500 when monitoring service throws', async () => {
    const { handler, context, logger, monitoringService } = setup();

    jest.spyOn(monitoringService, 'getSkillMetrics').mockRejectedValueOnce(new Error('ES error'));

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_SKILL_METRICS_URL.replace('{skillId}', 'skill-abc'),
      params: { skillId: 'skill-abc' },
      query: {
        from: '2025-06-01T00:00:00Z',
        to: '2025-06-07T23:59:59Z',
      },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
