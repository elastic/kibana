/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import { getADFqSingleMetricJobConfig } from '../../services/ml_common_configs';

apiTest.describe('create anomaly detector job', { tag: '@local-stateful-classic' }, () => {
  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.ml.indices.cleanAnomalyDetection();
  });

  apiTest('ML poweruser creates a single metric job', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();
    const jobId = 'fq_single_create_poweruser';
    const jobConfig = getADFqSingleMetricJobConfig(jobId);

    const res = await apiClient.put(`internal/ml/anomaly_detectors/${jobId}`, {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      body: jobConfig,
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(res.body.job_id).toBe(jobId);
    expect(res.body.groups).toStrictEqual(jobConfig.groups);
    expect(res.body.analysis_config.bucket_span).toBe(jobConfig.analysis_config.bucket_span);
    expect(res.body.analysis_config.detectors).toHaveLength(1);
    expect(res.body.analysis_config.detectors[0]).toMatchObject(
      jobConfig.analysis_config.detectors[0]
    );
  });

  apiTest('ML viewer cannot create a job', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlViewer();
    const jobId = 'fq_single_create_viewer';

    const res = await apiClient.put(`internal/ml/anomaly_detectors/${jobId}`, {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      body: getADFqSingleMetricJobConfig(jobId),
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(403);
    expect(res.body.error).toBe('Forbidden');
  });
});
