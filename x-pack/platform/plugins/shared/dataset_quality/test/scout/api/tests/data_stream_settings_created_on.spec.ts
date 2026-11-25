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
  deleteDataStreamIfExists,
  getDataStreamSettingsOfEarliestIndex,
  getLogsForDataset,
  rolloverDataStream,
} from '../../common';

/**
 * `createdOn` is derived from the creation date of the earliest backing index,
 * which only stateful deployments expose to the requesting user.
 */
const DATASET = 'dq.settings.ess';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const INGEST_TO = '2024-09-20T11:01:00.000Z';

apiTest.describe(
  'Dataset quality - createdOn of a data stream on stateful',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ logsSynthtraceEsClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...testData.COMMON_HEADERS, ...cookieHeader };

      await logsSynthtraceEsClient.index(
        getLogsForDataset({ dataset: DATASET, to: INGEST_TO, count: 1 })
      );
    });

    apiTest.afterAll(async ({ esClient, log, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);
    });

    apiTest(
      'returns the creation date of the earliest backing index, before and after a rollover',
      async ({ apiClient, esClient }) => {
        const settingsBefore = await getDataStreamSettingsOfEarliestIndex(esClient, DATA_STREAM);
        const before = await apiClient.get(testData.API.settings(DATA_STREAM), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(before).toHaveStatusCode(200);
        expect(before.body.createdOn).toBe(Number(settingsBefore?.index?.creation_date));

        // A rollover adds a newer backing index, so `createdOn` has to stay on
        // the earliest one.
        await rolloverDataStream(esClient, DATA_STREAM);
        const settingsAfter = await getDataStreamSettingsOfEarliestIndex(esClient, DATA_STREAM);
        const after = await apiClient.get(testData.API.settings(DATA_STREAM), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(after).toHaveStatusCode(200);
        expect(after.body.createdOn).toBe(Number(settingsAfter?.index?.creation_date));
      }
    );
  }
);
