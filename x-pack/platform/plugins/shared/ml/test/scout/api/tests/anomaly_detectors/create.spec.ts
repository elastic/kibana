/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';

const BASE_JOB_CONFIG = {
  description:
    'Single metric job based on the farequote dataset with 30m bucketspan and mean(responsetime)',
  groups: ['automated', 'farequote', 'single-metric'],
  analysis_config: {
    bucket_span: '30m',
    detectors: [{ function: 'mean', field_name: 'responsetime' }],
    influencers: [],
    summary_count_field_name: 'doc_count',
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '11MB' },
  model_plot_config: { enabled: true },
};

apiTest.describe('create anomaly detector job', { tag: '@local-stateful-classic' }, () => {
  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.ml.indices.cleanAnomalyDetection();
  });

  apiTest('ML poweruser creates a single metric job', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();
    const jobId = 'fq_single_create_poweruser';

    const res = await apiClient.put(`internal/ml/anomaly_detectors/${jobId}`, {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      body: { ...BASE_JOB_CONFIG, job_id: jobId },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(res.body.job_id).toBe(jobId);
    expect(res.body.groups).toStrictEqual(BASE_JOB_CONFIG.groups);
    expect(res.body.analysis_config.bucket_span).toBe(BASE_JOB_CONFIG.analysis_config.bucket_span);
    expect(res.body.analysis_config.detectors).toHaveLength(1);
    expect(res.body.analysis_config.detectors[0]).toMatchObject(
      BASE_JOB_CONFIG.analysis_config.detectors[0]
    );
  });

  apiTest('ML viewer cannot create a job', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlViewer();
    const jobId = 'fq_single_create_viewer';

    const res = await apiClient.put(`internal/ml/anomaly_detectors/${jobId}`, {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      body: { ...BASE_JOB_CONFIG, job_id: jobId },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(403);
    expect(res.body.error).toBe('Forbidden');
  });
});
