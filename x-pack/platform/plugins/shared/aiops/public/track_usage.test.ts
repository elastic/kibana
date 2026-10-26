/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { AIOPS_API_ENDPOINT, AIOPS_USAGE_ID } from '@kbn/aiops-common/constants';
import { AiopsUsage } from './track_usage';

describe('AiopsUsage', () => {
  const setup = (currentAppId?: string) => {
    const { http, application } = coreMock.createStart();
    (application as { currentAppId$: unknown }).currentAppId$ = new BehaviorSubject<
      string | undefined
    >(currentAppId);
    return { http, aiopsUsage: new AiopsUsage(http, application) };
  };

  it.each([
    ['trackCategorization', AIOPS_USAGE_ID.CATEGORIZATION],
    ['trackLogRateAnalysis', AIOPS_USAGE_ID.LOG_RATE_ANALYSIS],
    ['trackLogRateAnalysisFieldCandidates', AIOPS_USAGE_ID.LOG_RATE_ANALYSIS_FIELD_CANDIDATES],
    ['trackRenderEsqlCategorizationResults', AIOPS_USAGE_ID.RENDER_ESQL_CATEGORIZATION_RESULTS],
    ['trackRenderEsqlChangePointResults', AIOPS_USAGE_ID.RENDER_ESQL_CHANGE_POINT_RESULTS],
  ] as const)('%s should post the matching id and an explicit origin', async (method, id) => {
    const { http, aiopsUsage } = setup('dashboards');

    await aiopsUsage[method]('discover');

    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith(AIOPS_API_ENDPOINT.TELEMETRY, {
      version: '1',
      body: JSON.stringify({ id, origin: 'discover' }),
    });
  });

  it('should default the origin to the current app', async () => {
    const { http, aiopsUsage } = setup('dashboards');

    await aiopsUsage.trackRenderEsqlCategorizationResults();

    expect(http.post).toHaveBeenCalledWith(AIOPS_API_ENDPOINT.TELEMETRY, {
      version: '1',
      body: JSON.stringify({
        id: AIOPS_USAGE_ID.RENDER_ESQL_CATEGORIZATION_RESULTS,
        origin: 'dashboards',
      }),
    });
  });

  it('should use "unknown" as the origin if there is no current app', async () => {
    const { http, aiopsUsage } = setup(undefined);

    await aiopsUsage.trackRenderEsqlChangePointResults();

    expect(http.post).toHaveBeenCalledWith(AIOPS_API_ENDPOINT.TELEMETRY, {
      version: '1',
      body: JSON.stringify({
        id: AIOPS_USAGE_ID.RENDER_ESQL_CHANGE_POINT_RESULTS,
        origin: 'unknown',
      }),
    });
  });

  it('should ignore request failures', async () => {
    const { http, aiopsUsage } = setup('discover');
    http.post.mockRejectedValue(new Error('request failed'));

    await expect(aiopsUsage.trackCategorization()).resolves.toBeUndefined();
  });
});
