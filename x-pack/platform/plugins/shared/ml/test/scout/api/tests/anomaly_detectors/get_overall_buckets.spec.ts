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

const JOB_ID_1 = 'fq_single_overall_buckets_1';
const JOB_ID_2 = 'fq_single_overall_buckets_2';
const DATAFEED_ID_1 = `datafeed-${JOB_ID_1}`;
const DATAFEED_ID_2 = `datafeed-${JOB_ID_2}`;

apiTest.describe(
  'POST anomaly_detectors results overall_buckets',
  { tag: '@local-stateful-classic' },
  () => {
    apiTest.beforeAll(async ({ apiServices, esArchiver }) => {
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');

      for (const [jobId, datafeedId] of [
        [JOB_ID_1, DATAFEED_ID_1],
        [JOB_ID_2, DATAFEED_ID_2],
      ] as const) {
        const jobConfig = getADFqSingleMetricJobConfig(jobId);
        const datafeedConfig = getADFqDatafeedConfig(jobId);

        await apiServices.ml.anomalyDetection.createViaKibana(jobConfig);
        await apiServices.ml.datafeeds.create(datafeedConfig);
        await apiServices.ml.anomalyDetection.openJob(jobId);
        await apiServices.ml.datafeeds.start(datafeedId, {
          start: '0',
          end: String(Date.now()),
        });
        await apiServices.ml.datafeeds.waitForState(datafeedId, 'stopped');
        await apiServices.ml.anomalyDetection.waitForJobState(jobId, 'closed');
      }
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.ml.indices.cleanAnomalyDetection();
    });

    apiTest(
      'should get overall buckets with correct structure for multiple jobs',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlViewer();

        const res = await apiClient.post(
          `internal/ml/anomaly_detectors/${JOB_ID_1},${JOB_ID_2}/results/overall_buckets`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
            body: {
              topN: 1,
              bucketSpan: '1h',
              start: 0,
              end: Date.now(),
            },
            responseType: 'json',
          }
        );

        expect(res).toHaveStatusCode(200);
        expect(res.body.count).toBeGreaterThan(0);
        expect(res.body.overall_buckets).not.toHaveLength(0);
        const bucket = res.body.overall_buckets[0];
        expect(typeof bucket.bucket_span).toBe('number');
        expect(typeof bucket.is_interim).toBe('boolean');
        expect(Array.isArray(bucket.jobs)).toBe(true);
        expect(typeof bucket.overall_score).toBe('number');
        expect(typeof bucket.result_type).toBe('string');
        expect(typeof bucket.timestamp).toBe('number');
        expect(bucket.jobs).toHaveLength(2);
      }
    );

    apiTest('should respect the bucket_span parameter', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlViewer();

      const [res1h, res2h] = await Promise.all([
        apiClient.post(
          `internal/ml/anomaly_detectors/${JOB_ID_1},${JOB_ID_2}/results/overall_buckets`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
            body: { topN: 1, bucketSpan: '1h', start: 0, end: Date.now() },
            responseType: 'json',
          }
        ),
        apiClient.post(
          `internal/ml/anomaly_detectors/${JOB_ID_1},${JOB_ID_2}/results/overall_buckets`,
          {
            headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
            body: { topN: 1, bucketSpan: '2h', start: 0, end: Date.now() },
            responseType: 'json',
          }
        ),
      ]);

      expect(res1h).toHaveStatusCode(200);
      expect(res2h).toHaveStatusCode(200);
      expect(res1h.body.overall_buckets[0].bucket_span).not.toBe(
        res2h.body.overall_buckets[0].bucket_span
      );
    });

    apiTest('should filter results based on overall_score', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlViewer();
      const scoreThreshold = 5;

      const res = await apiClient.post(
        `internal/ml/anomaly_detectors/${JOB_ID_1},${JOB_ID_2}/results/overall_buckets`,
        {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          body: {
            topN: 1,
            bucketSpan: '1h',
            start: 0,
            end: Date.now(),
            overall_score: scoreThreshold,
          },
          responseType: 'json',
        }
      );

      expect(res).toHaveStatusCode(200);
      for (const bucket of res.body.overall_buckets as Array<{ overall_score: number }>) {
        expect(bucket.overall_score).toBeGreaterThan(scoreThreshold);
      }
    });

    apiTest('should fail with non-existent job', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlViewer();

      const res = await apiClient.post(
        `internal/ml/anomaly_detectors/non-existent-job/results/overall_buckets`,
        {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          body: { topN: 1, bucketSpan: '1h', start: 0, end: Date.now() },
          responseType: 'json',
        }
      );

      expect(res).toHaveStatusCode(404);
    });
  }
);
