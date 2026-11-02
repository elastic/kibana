/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { streamsApiTest as apiTest } from '../../fixtures';
import { findCount, getDocCounts } from '../../lib/doc_counts';
import { wiredUpsertRequest } from '../../lib/streams';

const ROOT = 'logs.otel';
const LOGGER = 'dcdegraded';
const STREAM = `${ROOT}.${LOGGER}`;

const routedDocument = (level: string, message: string) => {
  const timestamp = new Date().toISOString();
  return {
    '@timestamp': timestamp,
    message: JSON.stringify({
      '@timestamp': timestamp,
      'log.level': level,
      'log.logger': LOGGER,
      message,
    }),
  };
};

apiTest.describe('Doc counts - degraded', { tag: tags.deploymentAgnostic }, () => {
  // Counts are exact, so drop leftovers of an interrupted run first.
  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.streamsTest.cleanupTestStreams(STREAM);
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.streamsTest.cleanupTestStreams(STREAM);
  });

  apiTest(
    'counts documents with ignored fields',
    async ({ apiClient, samlAuth, apiServices, esClient }) => {
      const { cookieHeader } = await samlAuth.asStreamsReadOnly();

      await apiServices.streamsTest.forkStream(ROOT, STREAM, {
        field: 'attributes.log.logger',
        eq: LOGGER,
      });
      await apiServices.streamsTest.createStream(
        STREAM,
        wiredUpsertRequest({
          fields: { severity_text: { type: 'keyword', ignore_above: 1024 } },
          failureStore: { disabled: {} },
        })
      );
      await esClient.index({
        index: ROOT,
        document: routedDocument('info', 'clean message'),
        refresh: 'wait_for',
      });

      await apiTest.step('reports no degraded documents for a clean stream', async () => {
        const response = await getDocCounts(apiClient, cookieHeader, 'degraded', {
          stream: STREAM,
        });
        expect(response).toHaveStatusCode(200);
        expect(findCount(response.body, STREAM) ?? 0).toBe(0);
      });

      // A log level above the `ignore_above` limit lands in `_ignored`.
      await esClient.index({
        index: ROOT,
        document: routedDocument('a'.repeat(1025), 'degraded message'),
        refresh: 'wait_for',
      });

      await apiTest.step('includes the stream in the degraded counts', async () => {
        const response = await getDocCounts(apiClient, cookieHeader, 'degraded');
        expect(response).toHaveStatusCode(200);
        expect(findCount(response.body, STREAM)).toBe(1);
      });

      await apiTest.step('returns degraded counts for a single stream', async () => {
        const response = await getDocCounts(apiClient, cookieHeader, 'degraded', {
          stream: STREAM,
        });
        expect(response).toHaveStatusCode(200);
        expect(findCount(response.body, STREAM)).toBe(1);
      });
    }
  );
});
