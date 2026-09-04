/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest, testData } from '../fixtures';
import {
  buildDataStreamName,
  createComponentTemplate,
  createIndexTemplate,
  deleteComponentTemplateIfExists,
  deleteDataStreamIfExists,
  deleteIndexTemplateIfExists,
  getLogsForDataset,
  indexLogs,
  monitorRole,
} from '../../common';

/** Every resource is prefixed for this spec only, so no other suite can leak into it. */
const ENABLED_DATASET = 'dq.fs.on';
const DISABLED_DATASET = 'dq.fs.off';
const ENABLED_DATA_STREAM = buildDataStreamName({ dataset: ENABLED_DATASET });
const DISABLED_DATA_STREAM = buildDataStreamName({ dataset: DISABLED_DATASET });
const ENABLED_COMPONENT_TEMPLATE = 'dq-fs-on@mappings';
const DISABLED_COMPONENT_TEMPLATE = 'dq-fs-off@mappings';

const INGEST_TO = '2025-01-01T00:01:00.000Z';
const QUERY_START = '2025-01-01T00:00:00.000Z';
const QUERY_END = '2025-01-01T00:02:00.000Z';

const detailsUrl = (dataStream: string): string =>
  `${testData.API.details(dataStream)}?${new URLSearchParams({
    start: QUERY_START,
    end: QUERY_END,
  }).toString()}`;

apiTest.describe(
  'Dataset quality - failure store of a data stream',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminHeaders: Record<string, string>;
    let monitorHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ esClient, logsSynthtraceEsClient, samlAuth }) => {
      // One data stream gets the failure store, the other explicitly does not.
      await createComponentTemplate(esClient, {
        name: ENABLED_COMPONENT_TEMPLATE,
        dataStreamOptions: { failure_store: { enabled: true } },
      });
      await createComponentTemplate(esClient, {
        name: DISABLED_COMPONENT_TEMPLATE,
        dataStreamOptions: { failure_store: { enabled: false } },
      });
      await createIndexTemplate(esClient, {
        name: ENABLED_DATA_STREAM,
        indexPatterns: [ENABLED_DATA_STREAM],
        composedOf: ['logs@mappings', 'logs@settings', 'ecs@mappings', ENABLED_COMPONENT_TEMPLATE],
      });
      await createIndexTemplate(esClient, {
        name: DISABLED_DATA_STREAM,
        indexPatterns: [DISABLED_DATA_STREAM],
        composedOf: ['logs@mappings', 'logs@settings', 'ecs@mappings', DISABLED_COMPONENT_TEMPLATE],
      });

      await indexLogs(logsSynthtraceEsClient, [
        getLogsForDataset({ dataset: ENABLED_DATASET, to: INGEST_TO, count: 1 }),
        getLogsForDataset({ dataset: DISABLED_DATASET, to: INGEST_TO, count: 1 }),
      ]);

      const admin = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...testData.COMMON_HEADERS, ...admin.cookieHeader };
      const monitor = await samlAuth.asInteractiveUser(monitorRole);
      monitorHeaders = { ...testData.COMMON_HEADERS, ...monitor.cookieHeader };
    });

    apiTest.afterAll(async ({ esClient, log, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await deleteDataStreamIfExists(esClient, ENABLED_DATA_STREAM, log);
      await deleteDataStreamIfExists(esClient, DISABLED_DATA_STREAM, log);
      await deleteIndexTemplateIfExists(esClient, ENABLED_DATA_STREAM, log);
      await deleteIndexTemplateIfExists(esClient, DISABLED_DATA_STREAM, log);
      await deleteComponentTemplateIfExists(esClient, ENABLED_COMPONENT_TEMPLATE, log);
      await deleteComponentTemplateIfExists(esClient, DISABLED_COMPONENT_TEMPLATE, log);
    });

    apiTest('reports the hasFailureStore flag per data stream', async ({ apiClient }) => {
      const enabled = await apiClient.get(detailsUrl(ENABLED_DATA_STREAM), {
        headers: adminHeaders,
        responseType: 'json',
      });
      const disabled = await apiClient.get(detailsUrl(DISABLED_DATA_STREAM), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(enabled).toHaveStatusCode(200);
      expect(enabled.body.hasFailureStore).toBe(true);
      expect(disabled).toHaveStatusCode(200);
      expect(disabled.body.hasFailureStore).toBe(false);
    });

    apiTest(
      'returns the customRetentionPeriod configured on the failure store',
      async ({ apiClient, esClient }) => {
        await esClient.indices.putDataStreamOptions({
          name: ENABLED_DATA_STREAM,
          failure_store: {
            enabled: true,
            lifecycle: { data_retention: '30d', enabled: true },
          },
        });

        const response = await apiClient.get(detailsUrl(ENABLED_DATA_STREAM), {
          headers: monitorHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.customRetentionPeriod).toBe('30d');
      }
    );

    apiTest(
      'returns the defaultRetentionPeriod when the failure store has no custom retention',
      async ({ apiClient, esClient }) => {
        await esClient.indices.putDataStreamOptions({
          name: ENABLED_DATA_STREAM,
          failure_store: { enabled: true },
        });

        const response = await apiClient.get(detailsUrl(ENABLED_DATA_STREAM), {
          headers: monitorHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.defaultRetentionPeriod).toBeDefined();
      }
    );

    apiTest(
      'omits the defaultRetentionPeriod for a disabled failure store when the user cannot read it at cluster level',
      async ({ apiClient, esClient }) => {
        await esClient.indices.putDataStreamOptions({
          name: ENABLED_DATA_STREAM,
          failure_store: { enabled: false },
        });

        const response = await apiClient.get(detailsUrl(ENABLED_DATA_STREAM), {
          headers: monitorHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.defaultRetentionPeriod).toBeUndefined();
      }
    );
  }
);
