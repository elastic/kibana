/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import {
  getADFqSingleMetricJobConfig,
  getADFqDatafeedConfig,
} from '../../services/ml_common_configs';

const JOB_ID = 'fq_single_forecast';
const DATAFEED_ID = `datafeed-${JOB_ID}`;
const SPACE_1 = 'space1';
const SPACE_2 = 'space2';

apiTest.describe(
  'POST anomaly_detectors _forecast with spaces',
  { tag: '@local-stateful-classic' },
  () => {
    // Shared across serial tests in this describe (create → viewer denied → delete).
    let forecastId: string;

    apiTest.beforeAll(async ({ apiServices, esArchiver }) => {
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');
      await apiServices.spaces.create({ id: SPACE_1, name: 'space_one', disabledFeatures: [] });
      await apiServices.spaces.create({ id: SPACE_2, name: 'space_two', disabledFeatures: [] });

      const jobConfig = getADFqSingleMetricJobConfig(JOB_ID);
      const datafeedConfig = getADFqDatafeedConfig(JOB_ID);

      await apiServices.ml.anomalyDetection.createViaKibana(jobConfig, SPACE_1);
      await apiServices.ml.datafeeds.create(datafeedConfig, SPACE_1);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      // Best-effort close before cleanup (job may already be closed)
      try {
        await apiServices.ml.anomalyDetection.closeJob(JOB_ID);
      } catch {
        // ignore
      }
      await apiServices.spaces.delete(SPACE_1);
      await apiServices.spaces.delete(SPACE_2);
      await apiServices.ml.indices.cleanAnomalyDetection();
      await apiServices.ml.savedObjects.sync(false, SPACE_1);
      await apiServices.ml.savedObjects.sync(false, SPACE_2);
    });

    apiTest('forecast for non-existent job returns 404', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.post(
        `s/${SPACE_1}/internal/ml/anomaly_detectors/${JOB_ID}_invalid/_forecast`,
        {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          body: { duration: '1d' },
          responseType: 'json',
        }
      );

      expect(res).toHaveStatusCode(404);
    });

    apiTest('forecast in wrong space returns 404', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.post(
        `s/${SPACE_2}/internal/ml/anomaly_detectors/${JOB_ID}/_forecast`,
        {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          body: { duration: '1d' },
          responseType: 'json',
        }
      );

      expect(res).toHaveStatusCode(404);
    });

    apiTest('forecast lifecycle journey', async ({ apiClient, samlAuth, apiServices }) => {
      const { cookieHeader: poweruserCookie } = await samlAuth.asMlPoweruser();

      await apiTest.step('closed job returns 409 for forecast request', async () => {
        const res = await apiClient.post(
          `s/${SPACE_1}/internal/ml/anomaly_detectors/${JOB_ID}/_forecast`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...poweruserCookie },
            body: { duration: '1d' },
            responseType: 'json',
          }
        );
        expect(res).toHaveStatusCode(409);
      });

      await apiTest.step('opened job with no data returns 400', async () => {
        await apiServices.ml.anomalyDetection.openJob(JOB_ID);

        const res = await apiClient.post(
          `s/${SPACE_1}/internal/ml/anomaly_detectors/${JOB_ID}/_forecast`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...poweruserCookie },
            body: { duration: '1d' },
            responseType: 'json',
          }
        );
        expect(res).toHaveStatusCode(400);
      });

      await apiTest.step('run datafeed and reopen job', async () => {
        await apiServices.ml.datafeeds.start(DATAFEED_ID, {
          start: '0',
          end: String(Date.now()),
        });
        await apiServices.ml.datafeeds.waitForState(DATAFEED_ID, 'stopped');
        await apiServices.ml.anomalyDetection.waitForJobState(JOB_ID, 'closed');
        await apiServices.ml.anomalyDetection.openJob(JOB_ID);
      });

      await apiTest.step('poweruser can run forecast on open job with data', async () => {
        const res = await apiClient.post(
          `s/${SPACE_1}/internal/ml/anomaly_detectors/${JOB_ID}/_forecast`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...poweruserCookie },
            body: { duration: '1d' },
            responseType: 'json',
          }
        );
        expect(res).toHaveStatusCode(200);
        forecastId = (res.body as { forecast_id: string }).forecast_id;
        expect(forecastId).toBeDefined();

        await apiServices.ml.anomalyDetection.waitForForecastResults(JOB_ID);
      });

      await apiTest.step('invalid duration returns 400', async () => {
        const res = await apiClient.post(
          `s/${SPACE_1}/internal/ml/anomaly_detectors/${JOB_ID}/_forecast`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...poweruserCookie },
            body: { duration: 3600000 },
            responseType: 'json',
          }
        );
        expect(res).toHaveStatusCode(400);
      });
    });

    apiTest('poweruser can delete the forecast', async ({ apiClient, samlAuth }) => {
      const { cookieHeader: poweruserCookie } = await samlAuth.asMlPoweruser();

      const res = await apiClient.delete(
        `s/${SPACE_1}/internal/ml/anomaly_detectors/${JOB_ID}/_forecast/${forecastId}`,
        { headers: { ...INTERNAL_API_HEADERS, ...poweruserCookie } }
      );

      expect(res).toHaveStatusCode(200);
    });
  }
);
