/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import { getADFqSingleMetricJobConfig } from '../../services/ml_common_configs';

const JOB_ID = 'fq_single_with_datafeed';

const REQUEST_BODY = {
  ...getADFqSingleMetricJobConfig(JOB_ID),
  datafeed_config: {
    datafeed_id: `datafeed-${JOB_ID}`,
    indices: ['farequote-*'],
    query: { match_all: {} },
  },
};

apiTest.describe(
  'create anomaly detector job with inline datafeed config',
  { tag: '@local-stateful-classic' },
  () => {
    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.ml.indices.cleanAnomalyDetection();
    });

    apiTest(
      'ML poweruser creates a single metric job with datafeed',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.put(`internal/ml/anomaly_detectors/${JOB_ID}`, {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          body: REQUEST_BODY,
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
        expect(res.body.datafeed_config.datafeed_id).toBe(REQUEST_BODY.datafeed_config.datafeed_id);
        expect(res.body.datafeed_config.job_id).toBe(JOB_ID);
        expect(res.body.datafeed_config.indices).toStrictEqual(
          REQUEST_BODY.datafeed_config.indices
        );
      }
    );
  }
);
