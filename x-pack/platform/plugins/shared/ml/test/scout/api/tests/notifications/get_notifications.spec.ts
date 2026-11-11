/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationItem } from '@kbn/ml-common-types/notifications';
import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import {
  getADFqSingleMetricJobConfig,
  getDFABmClassificationJobConfig,
} from '../../services/ml_common_configs';

// Namespaced so a concurrent run on the same cluster cannot create jobs with these IDs
// inside our time range. The shared suffix keeps `df_job_*` sorting before `fq_job_*`.
const RUN_ID = Date.now();
const AD_JOB_ID = `fq_job_${RUN_ID}`;
const DFA_JOB_ID = `df_job_${RUN_ID}`;

// The endpoint returns notifications for every ML entity visible in the space plus the
// unscoped `system` channel, so exact totals and positional results must be scoped to our jobs.
const JOB_SCOPE = `job_id:(${AD_JOB_ID} OR ${DFA_JOB_ID})`;

apiTest.describe('GET notifications', { tag: '@local-stateful-classic' }, () => {
  let testStart: number;

  const notificationsUrl = (extraParams: string = '', extraQuery: string = '') => {
    const queryString = extraQuery ? `${JOB_SCOPE} AND ${extraQuery}` : JOB_SCOPE;
    return (
      `internal/ml/notifications?earliest=${testStart}&latest=now${extraParams}` +
      `&queryString=${encodeURIComponent(queryString)}`
    );
  };

  apiTest.beforeAll(async ({ esArchiver, apiServices }) => {
    testStart = Date.now();

    await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/bm_classification');
    await apiServices.ml.savedObjects.init();

    await apiServices.ml.anomalyDetection.createViaKibana(getADFqSingleMetricJobConfig(AD_JOB_ID));
    await apiServices.ml.dataFrameAnalytics.createViaKibana(
      getDFABmClassificationJobConfig(DFA_JOB_ID)
    );

    await apiServices.ml.notifications.waitForToIndex(AD_JOB_ID, testStart);
    await apiServices.ml.notifications.waitForToIndex(DFA_JOB_ID, testStart);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.ml.indices.cleanAnomalyDetection();
    await apiServices.ml.indices.cleanDataFrameAnalytics();
    await apiServices.ml.savedObjects.sync();
  });

  apiTest('returns all notifications for an authorized user', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get(notificationsUrl(), {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(res.body.total).toBe(2);
  });

  apiTest(
    'returns notifications for an authorized user when no queryString is provided',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      // Deliberately unscoped so the endpoint's default behaviour is exercised. Other jobs and
      // the system channel can contribute here, so assert the contract rather than an exact total.
      const res = await apiClient.get(
        `internal/ml/notifications?earliest=${testStart}&latest=now`,
        {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        }
      );

      expect(res).toHaveStatusCode(200);
      expect(typeof res.body.total).toBe('number');
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(2);

      const results = res.body.results as NotificationItem[];
      const jobIds = results.map((result) => result.job_id);
      expect(jobIds).toContain(AD_JOB_ID);
      expect(jobIds).toContain(DFA_JOB_ID);

      const [notification] = results.filter((result) => result.job_id === AD_JOB_ID);
      expect(notification).toBeDefined();
      expect(typeof notification.id).toBe('string');
      expect(typeof notification.message).toBe('string');
      expect(typeof notification.level).toBe('string');
      expect(typeof notification.timestamp).toBe('number');
      expect(typeof notification.node_name).toBe('string');
      expect(notification.job_type).toBe('anomaly_detector');
    }
  );

  apiTest(
    'returns filtered notifications when queryString is provided',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlViewer();

      const res = await apiClient.get(notificationsUrl('', 'job_type:anomaly_detector'), {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      expect(res.body.total).toBe(1);
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].job_type).toBe('anomaly_detector');
    }
  );

  apiTest('returns notifications sorted ascending by job_id', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get(notificationsUrl('&sortField=job_id&sortDirection=asc'), {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(res.body.results[0].job_id).toBe(DFA_JOB_ID);
  });

  apiTest('returns notifications sorted descending by job_id', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get(notificationsUrl('&sortField=job_id&sortDirection=desc'), {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

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
