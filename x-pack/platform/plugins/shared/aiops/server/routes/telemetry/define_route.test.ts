/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { AIOPS_API_ENDPOINT, AIOPS_USAGE_ID } from '@kbn/aiops-common/constants';
import { AiopsUsage } from '../../lib/track_route_usage';
import { defineRoute } from './define_route';
import { telemetrySchema } from './schema';

describe('telemetry route', () => {
  const setup = () => {
    const usageCounter = usageCountersServiceMock.createSetupContract().createUsageCounter('test');
    const usageCollection = {
      createUsageCounter: jest.fn().mockReturnValue(usageCounter),
    } as unknown as UsageCollectionSetup;

    const router = httpServiceMock.createRouter();
    defineRoute(router as never, new AiopsUsage(usageCollection));

    const route = router.versioned.getRoute('post', AIOPS_API_ENDPOINT.TELEMETRY);
    const handler = route.versions['1']?.handler;
    if (!handler) {
      throw new Error('Handler for version [1] not found!');
    }

    return { usageCounter, handler };
  };

  it.each([
    [AIOPS_USAGE_ID.CATEGORIZATION, `POST ${AIOPS_API_ENDPOINT.CATEGORIZATION_FIELD_VALIDATION}`],
    [AIOPS_USAGE_ID.LOG_RATE_ANALYSIS, `POST ${AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS}`],
    [
      AIOPS_USAGE_ID.LOG_RATE_ANALYSIS_FIELD_CANDIDATES,
      `POST ${AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS_FIELD_CANDIDATES}`,
    ],
    [AIOPS_USAGE_ID.RENDER_ESQL_CATEGORIZATION_RESULTS, 'render_esql_categorization_results'],
    [AIOPS_USAGE_ID.RENDER_ESQL_CHANGE_POINT_RESULTS, 'render_esql_change_point_results'],
  ] as const)('should increment the counter for id "%s"', async (id, counterName) => {
    const { usageCounter, handler } = setup();
    const response = httpServerMock.createResponseFactory();

    await handler(
      {} as never,
      httpServerMock.createKibanaRequest({ body: { id, origin: 'dashboards' } }),
      response
    );

    expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName,
      counterType: 'run_via_dashboards',
      incrementBy: 1,
    });
    expect(response.ok).toHaveBeenCalled();
  });

  describe('schema', () => {
    it('should accept every usage id', () => {
      Object.values(AIOPS_USAGE_ID).forEach((id) => {
        expect(() => telemetrySchema.validate({ id, origin: 'discover' })).not.toThrow();
      });
    });

    it('should reject an unknown id', () => {
      expect(() => telemetrySchema.validate({ id: 'unknown', origin: 'discover' })).toThrow();
    });

    it('should reject a missing or oversized origin', () => {
      const id = AIOPS_USAGE_ID.CATEGORIZATION;
      expect(() => telemetrySchema.validate({ id })).toThrow();
      expect(() => telemetrySchema.validate({ id, origin: 'a'.repeat(257) })).toThrow();
    });
  });
});
