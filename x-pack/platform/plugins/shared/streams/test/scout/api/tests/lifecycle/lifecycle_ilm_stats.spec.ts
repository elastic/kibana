/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, type ApiClientFixture, type EsClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { StreamsApiServicesFixture } from '../../fixtures';
import { streamsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';
import { wiredUpsertRequest } from '../../lib/streams';

const PREFIX = 'logs.otel.ilmstats';
const POLICY_NAME = 'streams_ilmstats_hotwarmdelete';

// ILM is not available on serverless.
apiTest.describe('Lifecycle stats - ILM streams', { tag: tags.stateful.classic }, () => {
  const cleanup = async ({
    apiServices,
    esClient,
  }: {
    apiServices: StreamsApiServicesFixture;
    esClient: EsClient;
  }) => {
    await apiServices.streamsTest.cleanupTestStreams(PREFIX);
    await esClient.ilm.deleteLifecycle({ name: POLICY_NAME }, { ignore: [404] });
  };

  // Names are fixed, so drop leftovers of an interrupted run first.
  apiTest.beforeEach(cleanup);

  apiTest.afterEach(cleanup);

  const getIlmStats = (
    apiClient: ApiClientFixture,
    cookieHeader: Record<string, string>,
    streamName: string
  ) =>
    apiClient.get(`internal/streams/${streamName}/lifecycle/_stats`, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

  apiTest('reports a missing ILM policy', async ({ apiClient, samlAuth, apiServices }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const streamName = `${PREFIX}-missing-policy`;
    await apiServices.streamsTest.createStream(
      streamName,
      wiredUpsertRequest({ lifecycle: { ilm: { policy: 'this-stream-policy-does-not-exist' } } })
    );

    const response = await getIlmStats(apiClient, cookieHeader, streamName);
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ policy_missing: true });
  });

  apiTest(
    'returns the effective ILM phases',
    async ({ apiClient, samlAuth, apiServices, esClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const streamName = `${PREFIX}-with-phases`;
      await esClient.ilm.putLifecycle({
        name: POLICY_NAME,
        policy: {
          phases: {
            hot: { actions: { rollover: { max_age: '30m' } } },
            warm: { min_age: '5d', actions: {} },
            delete: { min_age: '10d', actions: {} },
          },
        },
      });

      await apiServices.streamsTest.createStream(
        streamName,
        wiredUpsertRequest({ lifecycle: { ilm: { policy: POLICY_NAME } } })
      );

      const response = await getIlmStats(apiClient, cookieHeader, streamName);
      expect(response).toHaveStatusCode(200);
      // Scout's API `expect` has no `any(Number)`; `> -1` accepts any size, including 0.
      expect(response.body).toStrictEqual({
        phases: {
          hot: {
            name: 'hot',
            size_in_bytes: expect.toBeGreaterThan(-1),
            rollover: { max_age: '30m' },
            min_age: '0ms',
          },
          warm: { name: 'warm', min_age: '5d', size_in_bytes: expect.toBeGreaterThan(-1) },
          delete: { name: 'delete', min_age: '10d' },
        },
        policy_missing: false,
      });
    }
  );
});
