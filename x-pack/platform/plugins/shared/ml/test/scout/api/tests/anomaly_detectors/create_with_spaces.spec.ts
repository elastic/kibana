/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import { getADFqSingleMetricJobConfig } from '../../services/ml_common_configs';

const JOB_ID = 'fq_single_space1';
const SPACE_1 = 'space1';
const SPACE_2 = 'space2';

apiTest.describe(
  'create anomaly detector job in a space',
  { tag: '@local-stateful-classic' },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.spaces.create({ id: SPACE_1, name: 'space_one', disabledFeatures: [] });
      await apiServices.spaces.create({ id: SPACE_2, name: 'space_two', disabledFeatures: [] });
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(SPACE_1);
      await apiServices.spaces.delete(SPACE_2);
      await apiServices.ml.indices.cleanAnomalyDetection();
      await apiServices.ml.savedObjects.sync(false, SPACE_1);
      await apiServices.ml.savedObjects.sync(false, SPACE_2);
    });

    apiTest(
      'should create a job in space1 and associate it with that space only',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();
        const jobConfig = getADFqSingleMetricJobConfig(JOB_ID);

        const { job_id: _jobId, ...jobBody } = jobConfig;
        const res = await apiClient.put(`s/${SPACE_1}/internal/ml/anomaly_detectors/${JOB_ID}`, {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          body: jobBody,
          responseType: 'json',
        });
        expect(res).toHaveStatusCode(200);

        // Verify the job is accessible from space1 but not from space2
        const fromSpace1 = await apiClient.get(
          `s/${SPACE_1}/internal/ml/anomaly_detectors/${JOB_ID}`,
          { headers: { ...INTERNAL_API_HEADERS, ...cookieHeader }, responseType: 'json' }
        );
        expect(fromSpace1).toHaveStatusCode(200);
        expect(fromSpace1.body.count).toBe(1);

        const fromSpace2 = await apiClient.get(
          `s/${SPACE_2}/internal/ml/anomaly_detectors/${JOB_ID}`,
          { headers: { ...INTERNAL_API_HEADERS, ...cookieHeader }, responseType: 'json' }
        );
        expect(fromSpace2).toHaveStatusCode(404);
      }
    );
  }
);
