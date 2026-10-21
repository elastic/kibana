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

const STREAM = 'logs-dcingestion-failing';

apiTest.describe(
  'Doc counts - ingestion with failure store documents',
  { tag: tags.deploymentAgnostic },
  () => {
    // Counts are exact, so drop leftovers of an interrupted run first.
    apiTest.beforeEach(async ({ apiServices }) => {
      await apiServices.streamsTest.deleteClassicDataStream(STREAM);
    });

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.streamsTest.deleteClassicDataStream(STREAM);
    });

    apiTest(
      'folds failure store documents into the ingestion count for privileged users only',
      async ({ apiClient, samlAuth, apiServices, esClient }) => {
        const admin = await samlAuth.asInteractiveUser('admin');
        const readOnly = await samlAuth.asStreamsReadOnly();
        const query = { ...lastHourRange(), stream: STREAM };

        await esClient.indices.createDataStream({ name: STREAM });
        await apiServices.streamsTest.createStream(STREAM, failingClassicUpsertRequest());

        const indexResponse = await esClient.index({
          index: STREAM,
          document: { '@timestamp': new Date().toISOString(), message: 'failing document' },
        });
        expect(indexResponse.result).toBe('created');

        await expect
          .poll(
            () => getStreamCounts(apiClient, admin.cookieHeader, 'ingestion', query, [STREAM]),
            { timeout: METERING_REFRESH_TIMEOUT_MS }
          )
          .toStrictEqual({ statusCode: 200, counts: { [STREAM]: 1 } });

        // Read-only users lack `read_failure_store`, so failure store documents are not folded in.
        const readOnlyResponse = await getDocCounts(
          apiClient,
          readOnly.cookieHeader,
          'ingestion',
          query
        );
        expect(readOnlyResponse).toHaveStatusCode(200);
        expect(findCount(readOnlyResponse.body, STREAM) ?? 0).toBe(0);
      }
    );
  }
);
