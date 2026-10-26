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
} from '../../common';

/**
 * Stateful-only half of the failure-store retention checks: only there does the
 * cluster expose a default failure-store retention to a user that can read
 * cluster settings.
 *
 * Every resource is prefixed for this spec only, so no other suite can leak into it.
 */
const DATASET = 'dq.fs.ess';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const COMPONENT_TEMPLATE_NAME = 'dq-fs-ess@mappings';

const INGEST_TO = '2025-01-01T00:01:00.000Z';
const QUERY_START = '2025-01-01T00:00:00.000Z';
const QUERY_END = '2025-01-01T00:02:00.000Z';

const detailsUrl = (dataStream: string): string =>
  `${testData.API.details(dataStream)}?${new URLSearchParams({
    start: QUERY_START,
    end: QUERY_END,
  }).toString()}`;

apiTest.describe(
  'Dataset quality - failure store retention of a data stream on stateful',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ esClient, logsSynthtraceEsClient, samlAuth }) => {
      await createComponentTemplate(esClient, {
        name: COMPONENT_TEMPLATE_NAME,
        dataStreamOptions: { failure_store: { enabled: true } },
      });
      await createIndexTemplate(esClient, {
        name: DATA_STREAM,
        indexPatterns: [DATA_STREAM],
        composedOf: ['logs@mappings', 'logs@settings', 'ecs@mappings', COMPONENT_TEMPLATE_NAME],
      });
      await logsSynthtraceEsClient.index(
        getLogsForDataset({ dataset: DATASET, to: INGEST_TO, count: 1 })
      );

      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...testData.COMMON_HEADERS, ...cookieHeader };
    });

    apiTest.afterAll(async ({ esClient, log, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);
      await deleteIndexTemplateIfExists(esClient, DATA_STREAM, log);
      await deleteComponentTemplateIfExists(esClient, COMPONENT_TEMPLATE_NAME, log);
    });

    apiTest(
      'returns the cluster level defaultRetentionPeriod for a disabled failure store',
      async ({ apiClient, esClient }) => {
        await esClient.indices.putDataStreamOptions({
          name: DATA_STREAM,
          failure_store: { enabled: false },
        });

        const response = await apiClient.get(detailsUrl(DATA_STREAM), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        // A retention period is a duration string such as '30d'. `toBeDefined` alone
        // would also accept `null`, which is the shape a regression here would take.
        expect(typeof response.body.defaultRetentionPeriod).toBe('string');
        expect(response.body.defaultRetentionPeriod).not.toBe('');
      }
    );
  }
);
