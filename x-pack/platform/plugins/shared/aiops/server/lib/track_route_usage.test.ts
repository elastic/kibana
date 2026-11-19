/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { AIOPS_API_ENDPOINT } from '@kbn/aiops-common/constants';
import { AiopsUsage } from './track_route_usage';

describe('AiopsUsage', () => {
  const setup = () => {
    const usageCounter = usageCountersServiceMock.createSetupContract().createUsageCounter('test');
    const usageCollection = {
      createUsageCounter: jest.fn().mockReturnValue(usageCounter),
    } as unknown as UsageCollectionSetup;
    return { usageCounter, aiopsUsage: new AiopsUsage(usageCollection) };
  };

  it.each([
    ['trackCategorization', AIOPS_API_ENDPOINT.CATEGORIZATION_FIELD_VALIDATION],
    ['trackLogRateAnalysis', AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS],
    ['trackLogRateAnalysisFieldCandidates', AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS_FIELD_CANDIDATES],
  ] as const)('%s should call `usageCounter.incrementCounter`', (method, endpoint) => {
    const { usageCounter, aiopsUsage } = setup();

    aiopsUsage[method]('test_source');
    expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: `POST ${endpoint}`,
      counterType: 'run_via_test_source',
      incrementBy: 1,
    });
  });

  it('trackRenderEsqlCategorizationResults should call `usageCounter.incrementCounter`', () => {
    const { usageCounter, aiopsUsage } = setup();

    aiopsUsage.trackRenderEsqlCategorizationResults('test_source');
    expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'render_esql_categorization_results',
      counterType: 'run_via_test_source',
      incrementBy: 1,
    });
  });

  it('trackRenderEsqlChangePointResults should call `usageCounter.incrementCounter`', () => {
    const { usageCounter, aiopsUsage } = setup();

    aiopsUsage.trackRenderEsqlChangePointResults('test_source');
    expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'render_esql_change_point_results',
      counterType: 'run_via_test_source',
      incrementBy: 1,
    });
  });

  it('should not increment the counter if the origin is missing', () => {
    const { usageCounter, aiopsUsage } = setup();

    aiopsUsage.trackCategorization(undefined);
    expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  it('should do nothing if usage collection is not available', () => {
    expect(() => new AiopsUsage().trackCategorization('test_source')).not.toThrow();
  });
});
