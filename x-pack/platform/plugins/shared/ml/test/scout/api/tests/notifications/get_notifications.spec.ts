/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import {
  getADFqSingleMetricJobConfig,
  getDFABmClassificationJobConfig,
} from '../../services/ml_common_configs';

const AD_JOB_ID = 'fq_job';
const DFA_JOB_ID = 'df_job';

apiTest.describe('GET notifications', { tag: '@local-stateful-classic' }, () => {
  let testStart: number;

  apiTest.beforeAll(async ({ esArchiver, apiServices }) => {
    testStart = Date.now();

    await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/bm_classification');
    await apiServices.ml.savedObjects.init();

    await apiServices.ml.anomalyDetection.createViaKibana(getADFqSingleMetricJobConfig(AD_JOB_ID));
    await apiServices.ml.dataFrameAnalytics.createViaKibana(
      getDFABmClassificationJobConfig(DFA_JOB_ID)
    );

    await apiServices.ml.notifications.waitForToIndex(AD_JOB_ID);
    await apiServices.ml.notifications.waitForToIndex(DFA_JOB_ID);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.ml.indices.cleanAnomalyDetection();
    await apiServices.ml.indices.cleanDataFrameAnalytics();
    await apiServices.ml.savedObjects.sync();
  });

  apiTest('returns all notifications for an authorized user', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get(`internal/ml/notifications?earliest=${testStart}&latest=now`, {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(res.body.total).toBe(2);
  });

  apiTest(
    'returns filtered notifications when queryString is provided',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlViewer();

      const res = await apiClient.get(
        `internal/ml/notifications?earliest=${testStart}&latest=now&queryString=${encodeURIComponent(
          'job_type:anomaly_detector'
        )}`,
        { headers: { ...INTERNAL_API_HEADERS, ...cookieHeader }, responseType: 'json' }
      );

      expect(res).toHaveStatusCode(200);
      expect(res.body.total).toBe(1);
    }
  );

  apiTest('returns notifications sorted ascending by job_id', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get(
      `internal/ml/notifications?earliest=${testStart}&latest=now&sortField=job_id&sortDirection=asc`,
      { headers: { ...INTERNAL_API_HEADERS, ...cookieHeader }, responseType: 'json' }
    );

    expect(res).toHaveStatusCode(200);
    expect(res.body.results[0].job_id).toBe(DFA_JOB_ID);
  });

  apiTest('returns notifications sorted descending by job_id', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get(
      `internal/ml/notifications?earliest=${testStart}&latest=now&sortField=job_id&sortDirection=desc`,
      { headers: { ...INTERNAL_API_HEADERS, ...cookieHeader }, responseType: 'json' }
    );

    expect(res).toHaveStatusCode(200);
    expect(res.body.results[0].job_id).toBe(AD_JOB_ID);
  });

  apiTest('returns 403 for unauthorized user', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlUnauthorized();

    const res = await apiClient.get(`internal/ml/notifications?earliest=${testStart}&latest=now`, {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(403);
  });
});
