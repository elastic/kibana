/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import { getADFqSingleMetricJobConfig } from '../../services/ml_common_configs';

apiTest.describe('GET notifications count', { tag: '@local-stateful-classic' }, () => {
  let testStart: number;

  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.ml.indices.cleanAnomalyDetection();
    testStart = Date.now();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.ml.indices.cleanAnomalyDetection();
    await apiServices.ml.savedObjects.sync();
  });

  apiTest(
    'returns default response when no ML entities are present',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.get(
        `internal/ml/notifications/count?lastCheckedAt=${testStart}`,
        { headers: { ...INTERNAL_API_HEADERS, ...cookieHeader }, responseType: 'json' }
      );

      expect(res).toHaveStatusCode(200);
      expect(res.body.info).toBe(0);
      expect(res.body.warning).toBe(0);
      expect(res.body.error).toBe(0);
    }
  );

  apiTest(
    'returns notifications count by level after creating a job',
    async ({ apiClient, samlAuth, apiServices }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();
      const jobId = `fq_job_count_${Date.now()}`;

      const getCount = async () => {
        const res = await apiClient.get(
          `internal/ml/notifications/count?lastCheckedAt=${testStart}`,
          { headers: { ...INTERNAL_API_HEADERS, ...cookieHeader }, responseType: 'json' }
        );
        expect(res).toHaveStatusCode(200);
        return res.body;
      };

      // The endpoint counts every notification visible in the space, including system-level
      // ones that carry no job filter, so compare against a baseline taken just before the
      // job is created rather than assuming this suite is the only source of notifications.
      const before = await getCount();

      await apiServices.ml.savedObjects.init();
      await apiServices.ml.anomalyDetection.createViaKibana(getADFqSingleMetricJobConfig(jobId));
      await apiServices.ml.notifications.waitForToIndex(jobId, testStart);

      const after = await getCount();

      expect(after.info).toBeGreaterThanOrEqual(before.info + 1);
    }
  );

  apiTest('returns 403 for unauthorized user', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlUnauthorized();

    const res = await apiClient.get(`internal/ml/notifications/count?lastCheckedAt=${testStart}`, {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(403);
  });
});
