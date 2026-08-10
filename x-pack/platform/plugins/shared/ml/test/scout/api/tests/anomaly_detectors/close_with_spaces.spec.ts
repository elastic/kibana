/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import { getADFqSingleMetricJobConfig } from '../../services/ml_common_configs';

const SPACE_1 = 'space1';
const SPACE_2 = 'space2';

apiTest.describe(
  'close anomaly detector job with spaces',
  { tag: '@local-stateful-classic' },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.spaces.create({ id: SPACE_1, name: 'space_one', disabledFeatures: [] });
      await apiServices.spaces.create({ id: SPACE_2, name: 'space_two', disabledFeatures: [] });
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.ml.indices.cleanAnomalyDetection();
      await apiServices.ml.savedObjects.sync(false, SPACE_1);
      await apiServices.ml.savedObjects.sync(false, SPACE_2);
      await apiServices.spaces.delete(SPACE_1);
      await apiServices.spaces.delete(SPACE_2);
    });

    apiTest(
      'ML poweruser can close a job from the correct space',
      async ({ apiClient, samlAuth, apiServices }) => {
        const jobId = 'fq_single_close_correct_space';
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        await apiServices.ml.anomalyDetection.createViaKibana(
          getADFqSingleMetricJobConfig(jobId),
          SPACE_1
        );
        await apiServices.ml.anomalyDetection.openJob(jobId);

        const res = await apiClient.post(
          `s/${SPACE_1}/internal/ml/anomaly_detectors/${jobId}/_close`,
          { headers: { ...INTERNAL_API_HEADERS, ...cookieHeader } }
        );

        expect(res).toHaveStatusCode(200);
      }
    );

    apiTest(
      'ML poweruser cannot close a job from the wrong space',
      async ({ apiClient, samlAuth, apiServices }) => {
        const jobId = 'fq_single_close_wrong_space';
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        await apiServices.ml.anomalyDetection.createViaKibana(
          getADFqSingleMetricJobConfig(jobId),
          SPACE_1
        );
        await apiServices.ml.anomalyDetection.openJob(jobId);

        const res = await apiClient.post(
          `s/${SPACE_2}/internal/ml/anomaly_detectors/${jobId}/_close`,
          { headers: { ...INTERNAL_API_HEADERS, ...cookieHeader } }
        );

        expect(res).toHaveStatusCode(404);

        await apiServices.ml.anomalyDetection.closeJob(jobId);
      }
    );
  }
);
