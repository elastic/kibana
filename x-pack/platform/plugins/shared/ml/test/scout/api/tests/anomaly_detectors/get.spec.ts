/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import { getADFqSingleMetricJobConfig } from '../../services/ml_common_configs';

const JOB_ID = 'fq_single_get';

apiTest.describe('get anomaly detector jobs', { tag: '@local-stateful-classic' }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.ml.anomalyDetection.createViaKibana(getADFqSingleMetricJobConfig(JOB_ID));
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.ml.indices.cleanAnomalyDetection();
  });

  apiTest('GET all jobs returns the created job', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get('internal/ml/anomaly_detectors', {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    const job = (res.body.jobs as Array<{ job_id: string }>).find((j) => j.job_id === JOB_ID);
    expect(job).toBeDefined();
  });

  apiTest('GET job by ID returns the expected job', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get(`internal/ml/anomaly_detectors/${JOB_ID}`, {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(res.body.count).toBe(1);
    expect(res.body.jobs[0].job_id).toBe(JOB_ID);
  });

  apiTest('GET stats for all jobs returns the created job', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get('internal/ml/anomaly_detectors/_stats', {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    const jobStats = (res.body.jobs as Array<{ job_id: string }>).find((j) => j.job_id === JOB_ID);
    expect(jobStats).toBeDefined();
  });

  apiTest('GET stats by job ID returns the expected job', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get(`internal/ml/anomaly_detectors/${JOB_ID}/_stats`, {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(res.body.count).toBe(1);
    expect(res.body.jobs[0].job_id).toBe(JOB_ID);
  });
});
