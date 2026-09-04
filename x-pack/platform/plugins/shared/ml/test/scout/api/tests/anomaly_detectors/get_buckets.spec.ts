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

const JOB_ID = 'fq_single_buckets';
const DATAFEED_ID = `datafeed-${JOB_ID}`;

apiTest.describe(
  'POST anomaly_detectors results buckets',
  { tag: '@local-stateful-classic' },
  () => {
    apiTest.beforeAll(async ({ apiServices, esArchiver }) => {
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');

      const jobConfig = getADFqSingleMetricJobConfig(JOB_ID);
      const datafeedConfig = getADFqDatafeedConfig(JOB_ID);

      await apiServices.ml.anomalyDetection.createViaKibana(jobConfig);
      await apiServices.ml.datafeeds.create(datafeedConfig);
      await apiServices.ml.anomalyDetection.openJob(JOB_ID);
      await apiServices.ml.datafeeds.start(DATAFEED_ID, {
        start: '0',
        end: String(Date.now()),
      });
      await apiServices.ml.datafeeds.waitForState(DATAFEED_ID, 'stopped');
      await apiServices.ml.anomalyDetection.waitForJobState(JOB_ID, 'closed');
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.ml.indices.cleanAnomalyDetection();
    });

    apiTest(
      'should get buckets with correct structure for a job',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlViewer();

        const res = await apiClient.post(
          `internal/ml/anomaly_detectors/${JOB_ID}/results/buckets`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
            body: {},
            responseType: 'json',
          }
        );

        expect(res).toHaveStatusCode(200);
        expect(res.body.count).toBeGreaterThan(0);
        expect(res.body.buckets).not.toHaveLength(0);
        const bucket = res.body.buckets[0];
        expect(typeof bucket.job_id).toBe('string');
        expect(typeof bucket.timestamp).toBe('number');
        expect(typeof bucket.anomaly_score).toBe('number');
        expect(typeof bucket.bucket_span).toBe('number');
        expect(typeof bucket.result_type).toBe('string');
      }
    );

    apiTest(
      'should get a single bucket when timestamp is specified',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlViewer();

        const allBucketsRes = await apiClient.post(
          `internal/ml/anomaly_detectors/${JOB_ID}/results/buckets`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
            body: {},
            responseType: 'json',
          }
        );
        expect(allBucketsRes).toHaveStatusCode(200);

        const sampleTimestamp = allBucketsRes.body.buckets[0].timestamp;

        const res = await apiClient.post(
          `internal/ml/anomaly_detectors/${JOB_ID}/results/buckets/${sampleTimestamp}`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
            body: {},
            responseType: 'json',
          }
        );

        expect(res).toHaveStatusCode(200);
        expect(res.body.count).toBe(1);
        expect(res.body.buckets).toHaveLength(1);
      }
    );

    apiTest('should fail with non-existent job', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlViewer();

      const res = await apiClient.post(
        `internal/ml/anomaly_detectors/non-existent-job/results/buckets`,
        {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          body: {},
          responseType: 'json',
        }
      );

      expect(res).toHaveStatusCode(404);
    });

    apiTest('should fail with non-existent timestamp', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlViewer();

      const res = await apiClient.post(
        `internal/ml/anomaly_detectors/${JOB_ID}/results/buckets/1`,
        {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          body: {},
          responseType: 'json',
        }
      );

      expect(res).toHaveStatusCode(404);
    });
  }
);
