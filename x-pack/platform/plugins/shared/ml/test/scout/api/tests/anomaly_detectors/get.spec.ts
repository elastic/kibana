/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import { getADFqSingleMetricJobConfig } from '../../services/ml_common_configs';

// Two jobs so the comma-separated multi-job routes can be exercised. Elasticsearch returns
// jobs ordered by job_id, so the `_1` / `_2` suffixes fix the expected order.
const JOB_ID_1 = 'fq_single_get_1';
const JOB_ID_2 = 'fq_single_get_2';

apiTest.describe('get anomaly detector jobs', { tag: '@local-stateful-classic' }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.ml.anomalyDetection.createViaKibana(getADFqSingleMetricJobConfig(JOB_ID_1));
    await apiServices.ml.anomalyDetection.createViaKibana(getADFqSingleMetricJobConfig(JOB_ID_2));
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.ml.indices.cleanAnomalyDetection();
  });

  apiTest('GET all jobs returns the created jobs', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get('internal/ml/anomaly_detectors', {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
    const jobIds = (res.body.jobs as Array<{ job_id: string }>).map((j) => j.job_id);
    expect(jobIds).toContain(JOB_ID_1);
    expect(jobIds).toContain(JOB_ID_2);
  });

  apiTest('GET job by ID returns the expected job', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get(`internal/ml/anomaly_detectors/${JOB_ID_1}`, {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(res.body.count).toBe(1);
    expect(res.body.jobs).toHaveLength(1);
    expect(res.body.jobs[0].job_id).toBe(JOB_ID_1);
  });

  apiTest('GET jobs by comma-separated IDs returns both jobs', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get(`internal/ml/anomaly_detectors/${JOB_ID_1},${JOB_ID_2}`, {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(res.body.count).toBe(2);
    expect(res.body.jobs).toHaveLength(2);
    const jobIds = (res.body.jobs as Array<{ job_id: string }>).map((j) => j.job_id);
    expect(jobIds).toStrictEqual([JOB_ID_1, JOB_ID_2]);
  });

  apiTest('GET stats for all jobs returns the created jobs', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get('internal/ml/anomaly_detectors/_stats', {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
    const jobIds = (res.body.jobs as Array<{ job_id: string }>).map((j) => j.job_id);
    expect(jobIds).toContain(JOB_ID_1);
    expect(jobIds).toContain(JOB_ID_2);
  });

  apiTest('GET stats by job ID returns the expected job', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get(`internal/ml/anomaly_detectors/${JOB_ID_1}/_stats`, {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(res.body.count).toBe(1);
    expect(res.body.jobs).toHaveLength(1);

    const [jobStats] = res.body.jobs;
    expect(jobStats.job_id).toBe(JOB_ID_1);
    expect(jobStats.timing_stats).toBeDefined();
    expect(jobStats.state).toBeDefined();
    expect(jobStats.forecasts_stats).toBeDefined();
    expect(jobStats.model_size_stats).toBeDefined();
    expect(jobStats.data_counts).toBeDefined();
  });

  apiTest('GET stats by comma-separated IDs returns both jobs', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get(
      `internal/ml/anomaly_detectors/${JOB_ID_1},${JOB_ID_2}/_stats`,
      {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      }
    );

    expect(res).toHaveStatusCode(200);
    expect(res.body.count).toBe(2);
    expect(res.body.jobs).toHaveLength(2);
    const jobIds = (res.body.jobs as Array<{ job_id: string }>).map((j) => j.job_id);
    expect(jobIds).toStrictEqual([JOB_ID_1, JOB_ID_2]);
  });
});
