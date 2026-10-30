/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { streamsApiTest as apiTest } from '../../fixtures';
import {
  METERING_REFRESH_TIMEOUT_MS,
  findCount,
  getDocCounts,
  getStreamCounts,
  lastHourRange,
} from '../../lib/doc_counts';
import { failingClassicUpsertRequest } from '../../lib/streams';

const STREAM = 'logs-dcfailed-stream';

apiTest.describe('Doc counts - failed', { tag: tags.deploymentAgnostic }, () => {
  // Counts are exact, so drop leftovers of an interrupted run first.
  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.streamsTest.deleteClassicDataStream(STREAM);
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.streamsTest.deleteClassicDataStream(STREAM);
  });

  apiTest(
    'counts documents sent to the failure store',
    async ({ apiClient, samlAuth, apiServices, esClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const range = lastHourRange();

      await esClient.indices.createDataStream({ name: STREAM });
      await apiServices.streamsTest.createStream(STREAM, failingClassicUpsertRequest());

      await apiTest.step('reports no failed documents before ingestion', async () => {
        const response = await getDocCounts(apiClient, cookieHeader, 'failed', {
          ...range,
          stream: STREAM,
        });
        expect(response).toHaveStatusCode(200);
        expect(findCount(response.body, STREAM) ?? 0).toBe(0);
      });

      const indexResponse = await esClient.index({
        index: STREAM,
        document: { '@timestamp': new Date().toISOString(), message: 'failing document' },
      });
      expect(indexResponse.result).toBe('created');

      await apiTest.step('includes the stream in the failed counts', async () => {
        await expect
          .poll(() => getStreamCounts(apiClient, cookieHeader, 'failed', range, [STREAM]), {
            timeout: METERING_REFRESH_TIMEOUT_MS,
          })
          .toStrictEqual({ statusCode: 200, counts: { [STREAM]: 1 } });
      });

      await apiTest.step('returns failed counts for a single stream', async () => {
        const response = await getDocCounts(apiClient, cookieHeader, 'failed', {
          ...range,
          stream: STREAM,
        });
        expect(response).toHaveStatusCode(200);
        expect(findCount(response.body, STREAM)).toBe(1);
      });
    }
  );
});
