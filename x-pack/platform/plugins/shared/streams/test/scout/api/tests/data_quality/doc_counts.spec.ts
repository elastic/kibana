/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { streamsApiTest as apiTest } from '../../fixtures';
import { METERING_REFRESH_TIMEOUT_MS, getStreamCounts, lastHourRange } from '../../lib/doc_counts';

const ROOT = 'logs.otel';
const PREFIX = `${ROOT}.dcounts`;
const STREAM_1 = `${PREFIX}-1`;
const STREAM_2 = `${PREFIX}-2`;
const CLASSIC_STREAM = 'logs-dcounts-classic';

const routedDocument = (logger: string, message: string) => {
  const timestamp = new Date().toISOString();
  return {
    '@timestamp': timestamp,
    message: JSON.stringify({
      '@timestamp': timestamp,
      'log.level': 'info',
      'log.logger': logger,
      message,
    }),
  };
};

apiTest.describe('Doc counts - total and ingestion', { tag: tags.deploymentAgnostic }, () => {
  apiTest.beforeAll(async ({ apiServices, esClient }) => {
    // Counts are exact, so drop leftovers of an interrupted run first.
    await apiServices.streamsTest.cleanupTestStreams(PREFIX);
    await apiServices.streamsTest.deleteClassicDataStream(CLASSIC_STREAM);
    for (const stream of [STREAM_1, STREAM_2]) {
      await apiServices.streamsTest.forkStream(ROOT, stream, {
        field: 'attributes.log.logger',
        eq: stream.replace(`${ROOT}.`, ''),
      });
    }

    await esClient.index({
      index: CLASSIC_STREAM,
      document: { message: '2023-01-01T00:00:10.000Z error test' },
      refresh: 'wait_for',
    });
    for (const [logger, message] of [
      ['dcounts-1', 'test message 1'],
      ['dcounts-1', 'test message 2'],
      ['dcounts-2', 'test message 3'],
    ]) {
      await esClient.index({
        index: ROOT,
        document: routedDocument(logger, message),
        refresh: 'wait_for',
      });
    }
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.streamsTest.cleanupTestStreams(PREFIX);
    await apiServices.streamsTest.deleteClassicDataStream(CLASSIC_STREAM);
  });

  apiTest('returns total document counts for all streams', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsReadOnly();

    await expect
      .poll(
        () =>
          getStreamCounts(apiClient, cookieHeader, 'total', {}, [
            CLASSIC_STREAM,
            STREAM_1,
            STREAM_2,
          ]),
        { timeout: METERING_REFRESH_TIMEOUT_MS }
      )
      .toStrictEqual({
        statusCode: 200,
        counts: { [CLASSIC_STREAM]: 1, [STREAM_1]: 2, [STREAM_2]: 1 },
      });
  });

  apiTest('returns total document counts for a single stream', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsReadOnly();

    await expect
      .poll(
        () => getStreamCounts(apiClient, cookieHeader, 'total', { stream: STREAM_1 }, [STREAM_1]),
        { timeout: METERING_REFRESH_TIMEOUT_MS }
      )
      .toMatchObject({ statusCode: 200, counts: { [STREAM_1]: expect.toBeGreaterThan(0) } });
  });

  apiTest(
    'returns range-scoped ingestion counts for all streams',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsReadOnly();

      await expect
        .poll(
          () =>
            getStreamCounts(apiClient, cookieHeader, 'ingestion', lastHourRange(), [
              STREAM_1,
              STREAM_2,
            ]),
          { timeout: METERING_REFRESH_TIMEOUT_MS }
        )
        .toStrictEqual({ statusCode: 200, counts: { [STREAM_1]: 2, [STREAM_2]: 1 } });
    }
  );

  apiTest(
    'excludes documents outside the requested time range',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsReadOnly();

      const result = await getStreamCounts(
        apiClient,
        cookieHeader,
        'ingestion',
        { start: 0, end: 1 },
        [STREAM_1, STREAM_2]
      );
      expect(result).toStrictEqual({
        statusCode: 200,
        counts: { [STREAM_1]: undefined, [STREAM_2]: undefined },
      });
    }
  );

  apiTest('returns ingestion counts for a single stream', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsReadOnly();

    await expect
      .poll(
        () =>
          getStreamCounts(
            apiClient,
            cookieHeader,
            'ingestion',
            { ...lastHourRange(), stream: STREAM_1 },
            [STREAM_1]
          ),
        { timeout: METERING_REFRESH_TIMEOUT_MS }
      )
      .toStrictEqual({ statusCode: 200, counts: { [STREAM_1]: 2 } });
  });
});
