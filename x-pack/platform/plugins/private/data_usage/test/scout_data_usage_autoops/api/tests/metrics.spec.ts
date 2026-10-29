/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Server } from 'http';
import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { DATA_USAGE_METRICS_API_ROUTE } from '../../../../common';
import { METRIC_TYPE_VALUES } from '../../../../common/rest_types';
import { transformMetricsData } from '../../../../server/routes/internal/usage_metrics_handler';
import {
  apiTest,
  createDataStream,
  deleteDataStream,
  startAutoOpsMock,
  stopAutoOpsMock,
  AUTOOPS_METRICS_RESPONSE,
  DATA_STREAMS,
} from '../fixtures';

const [DATA_STREAM] = DATA_STREAMS;
const to = new Date();
const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

apiTest.describe(
  'Data Usage metrics API',
  {
    tag: [
      '@local-serverless-security_complete',
      '@local-serverless-observability_complete',
      '@local-serverless-observability_logs_essentials',
      '@local-serverless-search',
    ],
  },
  () => {
    let autoOpsMock: Server;
    let admin: Record<string, string>;

    const postMetrics = (apiClient: ApiClientFixture, body: Record<string, unknown>) =>
      apiClient.post(DATA_USAGE_METRICS_API_ROUTE, {
        headers: {
          'kbn-xsrf': 'scout',
          'x-elastic-internal-origin': 'kibana',
          'elastic-api-version': '1',
          ...admin,
        },
        body: { from: from.toISOString(), to: to.toISOString(), ...body },
        responseType: 'json',
      });

    apiTest.beforeAll(async ({ esClient, samlAuth }) => {
      admin = (await samlAuth.asInteractiveUser('admin')).cookieHeader;
      await deleteDataStream(esClient, DATA_STREAM);
      await createDataStream(esClient, DATA_STREAM);
      autoOpsMock = startAutoOpsMock();
    });

    apiTest.afterAll(async ({ esClient }) => {
      await stopAutoOpsMock(autoOpsMock);
      await deleteDataStream(esClient, DATA_STREAM);
    });

    apiTest('returns 400 for data streams that do not exist', async ({ apiClient }) => {
      const response = await postMetrics(apiClient, {
        metricTypes: ['ingest_rate', 'storage_retained'],
        dataStreams: ['scout-du-api-missing'],
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe('Failed to retrieve data streams');
    });

    apiTest('returns 400 when no data streams are requested', async ({ apiClient }) => {
      const response = await postMetrics(apiClient, {
        metricTypes: ['ingest_rate'],
        dataStreams: [],
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe('[request body.dataStreams]: no data streams selected');
    });

    apiTest('returns 400 for an invalid metric type', async ({ apiClient }) => {
      const response = await postMetrics(apiClient, {
        metricTypes: ['invalid_metric'],
        dataStreams: [DATA_STREAM],
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        `[request body.metricTypes]: must be one of ${METRIC_TYPE_VALUES.join(', ')}`
      );
    });

    apiTest('returns the AutoOps metrics for a valid request', async ({ apiClient }) => {
      const response = await postMetrics(apiClient, {
        metricTypes: ['ingest_rate', 'storage_retained'],
        dataStreams: [DATA_STREAM],
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(transformMetricsData(AUTOOPS_METRICS_RESPONSE));
    });
  }
);
