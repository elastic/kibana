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
const JOB_ID = 'fq_single_get_spaces';
const JOB_ID_WILDCARD = 'fq_single_get_spaces*';
// Dedicated group so the group assertions can check exact counts without matching
// jobs created by other suites.
const GROUP_ID = 'get_spaces_group';
const GROUP_ID_WILDCARD = 'get_spaces_group*';

const jobsUrl = (jobOrGroup?: string, space?: string) =>
  `${space ? `s/${space}/` : ''}internal/ml/anomaly_detectors${jobOrGroup ? `/${jobOrGroup}` : ''}`;

apiTest.describe(
  'get anomaly detector jobs with spaces',
  { tag: '@local-stateful-classic' },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.spaces.create({ id: SPACE_1, name: 'space_one', disabledFeatures: [] });
      await apiServices.spaces.create({ id: SPACE_2, name: 'space_two', disabledFeatures: [] });
      await apiServices.ml.anomalyDetection.createViaKibana(
        { ...getADFqSingleMetricJobConfig(JOB_ID), groups: [GROUP_ID] },
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

    apiTest('GET a non-existing job returns 404', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.get(jobsUrl('non-existing-job'), {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(404);
    });

    apiTest(
      'GET a non-existing job wildcard returns an empty list',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.get(jobsUrl('non-existing-job*'), {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
        expect(res.body.count).toBe(0);
        expect(res.body.jobs).toHaveLength(0);
      }
    );

    apiTest('GET job by ID from correct space returns the job', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.get(jobsUrl(JOB_ID, SPACE_1), {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      expect(res.body.count).toBe(1);
      expect(res.body.jobs).toHaveLength(1);
      expect(res.body.jobs[0].job_id).toBe(JOB_ID);
    });

    apiTest('GET job by ID from wrong space returns 404', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.get(jobsUrl(JOB_ID, SPACE_2), {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(404);
    });

    apiTest(
      'GET without an ID from correct space returns all jobs in that space',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.get(jobsUrl(undefined, SPACE_1), {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
        expect(res.body.count).toBe(1);
        expect(res.body.jobs).toHaveLength(1);
        expect(res.body.jobs[0].job_id).toBe(JOB_ID);
      }
    );

    apiTest(
      'GET without an ID from wrong space returns an empty list',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.get(jobsUrl(undefined, SPACE_2), {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
        expect(res.body.count).toBe(0);
        expect(res.body.jobs).toHaveLength(0);
      }
    );

    apiTest(
      'GET job by wildcard from correct space returns the job',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.get(jobsUrl(JOB_ID_WILDCARD, SPACE_1), {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
        expect(res.body.count).toBe(1);
        expect(res.body.jobs).toHaveLength(1);
        expect(res.body.jobs[0].job_id).toBe(JOB_ID);
      }
    );

    apiTest(
      'GET job by wildcard from wrong space returns an empty list',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.get(jobsUrl(JOB_ID_WILDCARD, SPACE_2), {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
        expect(res.body.count).toBe(0);
        expect(res.body.jobs).toHaveLength(0);
      }
    );

    apiTest(
      'GET jobs by group from correct space returns the job',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.get(jobsUrl(GROUP_ID, SPACE_1), {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
        expect(res.body.count).toBe(1);
        expect(res.body.jobs).toHaveLength(1);
        expect(res.body.jobs[0].job_id).toBe(JOB_ID);
      }
    );

    apiTest(
      'GET jobs by group wildcard from correct space returns the job',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.get(jobsUrl(GROUP_ID_WILDCARD, SPACE_1), {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
        expect(res.body.count).toBe(1);
        expect(res.body.jobs).toHaveLength(1);
        expect(res.body.jobs[0].job_id).toBe(JOB_ID);
      }
    );

    apiTest('GET jobs by group from wrong space returns 404', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.get(jobsUrl(GROUP_ID, SPACE_2), {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(404);
    });

    apiTest(
      'GET jobs by group wildcard from wrong space returns an empty list',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.get(jobsUrl(GROUP_ID_WILDCARD, SPACE_2), {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
        expect(res.body.count).toBe(0);
        expect(res.body.jobs).toHaveLength(0);
      }
    );
  }
);
