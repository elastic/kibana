/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { DataStreamsResponseBodySchemaBody } from '../../../../server/routes/internal/data_streams';
import {
  apiTest,
  createDataStream,
  deleteDataStream,
  getDataStreams,
  LOCAL_SERVERLESS_TAGS,
  METERING_TIMEOUT_MS,
} from '../fixtures';

const DATA_STREAM = 'scout-du-api-empty';

apiTest.describe('Data Usage data streams API', { tag: LOCAL_SERVERLESS_TAGS }, () => {
  let admin: Record<string, string>;

  apiTest.beforeAll(async ({ esClient, samlAuth }) => {
    admin = (await samlAuth.asInteractiveUser('admin')).cookieHeader;
    await deleteDataStream(esClient, DATA_STREAM);
    await createDataStream(esClient, DATA_STREAM);
  });

  apiTest.afterAll(async ({ esClient }) => {
    await deleteDataStream(esClient, DATA_STREAM);
  });

  apiTest('returns data streams without storage only when requested', async ({ apiClient }) => {
    await apiTest.step('includes it with includeZeroStorage', async () => {
      await expect
        .poll(async () => (await getDataStreams(apiClient, admin)).names, {
          timeout: METERING_TIMEOUT_MS,
        })
        .toContain(DATA_STREAM);
      const { statusCode, body } = await getDataStreams(apiClient, admin);
      expect(statusCode).toBe(200);
      expect(
        (body as DataStreamsResponseBodySchemaBody).find(({ name }) => name === DATA_STREAM)
      ).toStrictEqual({ name: DATA_STREAM, storageSizeBytes: 0 });
    });

    await apiTest.step('leaves it out by default', async () => {
      const { statusCode, body, names } = await getDataStreams(apiClient, admin, {
        includeZeroStorage: false,
      });
      const expectedByStatus: Record<number, object> = {
        // No data stream in the cluster has storage
        404: {
          body: {
            message:
              'No relevant user defined data streams found with storage size greater than zero',
          },
        },
        // Other data streams have storage and ours is left out
        200: { names: names.filter((name) => name !== DATA_STREAM) },
      };
      expect([200, 404]).toContain(statusCode);
      expect({ body, names }).toMatchObject(expectedByStatus[statusCode]);
    });
  });
});
