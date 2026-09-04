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
const JOB_ID = 'fq_single_stats_spaces';
const GROUP_ID = 'automated';

apiTest.describe(
  'get anomaly detector job stats with spaces',
  { tag: '@local-stateful-classic' },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.spaces.create({ id: SPACE_1, name: 'space_one', disabledFeatures: [] });
      await apiServices.spaces.create({ id: SPACE_2, name: 'space_two', disabledFeatures: [] });
      await apiServices.ml.anomalyDetection.createViaKibana(
        getADFqSingleMetricJobConfig(JOB_ID),
        SPACE_1
      );
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.ml.indices.cleanAnomalyDetection();
      await apiServices.ml.savedObjects.sync(false, SPACE_1);
      await apiServices.ml.savedObjects.sync(false, SPACE_2);
      await apiServices.spaces.delete(SPACE_1);
      await apiServices.spaces.delete(SPACE_2);
    });

    apiTest(
      'GET stats by ID from correct space returns the job stats',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.get(
          `s/${SPACE_1}/internal/ml/anomaly_detectors/${JOB_ID}/_stats`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(res).toHaveStatusCode(200);
        expect(res.body.count).toBe(1);
        expect(res.body.jobs[0].job_id).toBe(JOB_ID);
      }
    );

    apiTest('GET stats by ID from wrong space returns 404', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.get(
        `s/${SPACE_2}/internal/ml/anomaly_detectors/${JOB_ID}/_stats`,
        {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        }
      );

      expect(res).toHaveStatusCode(404);
    });

    apiTest(
      'GET stats by wildcard from correct space returns the job',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.get(
          `s/${SPACE_1}/internal/ml/anomaly_detectors/fq_single_stats_space*/_stats`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(res).toHaveStatusCode(200);
        expect(res.body.count).toBeGreaterThanOrEqual(1);
        const job = (res.body.jobs as Array<{ job_id: string }>).find((j) => j.job_id === JOB_ID);
        expect(job).toBeDefined();
      }
    );

    apiTest(
      'GET stats by wildcard from wrong space returns empty results',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.get(
          `s/${SPACE_2}/internal/ml/anomaly_detectors/fq_single_stats_space*/_stats`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );
        expect(res.body.count).toBe(0);
      }
    );

    apiTest(
      'GET stats by group from correct space returns the job',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.get(
          `s/${SPACE_1}/internal/ml/anomaly_detectors/${GROUP_ID}/_stats`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(res).toHaveStatusCode(200);
        const job = (res.body.jobs as Array<{ job_id: string }>).find((j) => j.job_id === JOB_ID);
        expect(job).toBeDefined();
      }
    );

    apiTest(
      'GET stats by group from wrong space returns no results for that job',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.get(
          `s/${SPACE_2}/internal/ml/anomaly_detectors/${GROUP_ID}/_stats`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(res).toHaveStatusCode(404);
      }
    );
  }
);
