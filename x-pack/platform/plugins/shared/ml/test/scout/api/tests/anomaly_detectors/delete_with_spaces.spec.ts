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
  'delete anomaly detector job with spaces',
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
      'ML poweruser can delete a job that belongs to their space',
      async ({ apiClient, samlAuth, apiServices }) => {
        const jobId = 'fq_single_delete_own_space';
        const { cookieHeader } = await samlAuth.asMlPoweruser();
        await apiServices.ml.anomalyDetection.createViaKibana(
          getADFqSingleMetricJobConfig(jobId),
          SPACE_1
        );

        const res = await apiClient.delete(`s/${SPACE_1}/internal/ml/anomaly_detectors/${jobId}`, {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        });
        expect(res).toHaveStatusCode(200);

        await apiServices.ml.anomalyDetection.waitForJobNotToExist(jobId);
      }
    );

    apiTest(
      'ML poweruser cannot delete a job from a different space',
      async ({ apiClient, samlAuth, apiServices }) => {
        const jobId = 'fq_single_delete_wrong_space';
        const { cookieHeader } = await samlAuth.asMlPoweruser();
        await apiServices.ml.anomalyDetection.createViaKibana(
          getADFqSingleMetricJobConfig(jobId),
          SPACE_1
        );

        const res = await apiClient.delete(`s/${SPACE_2}/internal/ml/anomaly_detectors/${jobId}`, {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        });
        expect(res).toHaveStatusCode(404);
      }
    );
  }
);
