/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, type EsClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { StreamsApiServicesFixture } from '../../fixtures';
import { streamsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';
import { wiredUpsertRequest } from '../../lib/streams';

const PREFIX = 'logs.otel.ilmpolicies';
const POLICY_PREFIX = 'streams_ilmpolicies';

// ILM is not available on serverless.
apiTest.describe('Lifecycle - ILM policies', { tag: tags.stateful.classic }, () => {
  const cleanup = async ({
    apiServices,
    esClient,
  }: {
    apiServices: StreamsApiServicesFixture;
    esClient: EsClient;
  }) => {
    await apiServices.streamsTest.cleanupTestStreams(PREFIX);
    for (const suffix of ['upsert', 'usage', 'no_phases', 'no_hot']) {
      const name = `${POLICY_PREFIX}_${suffix}`;
      await esClient.ilm.deleteLifecycle({ name }, { ignore: [404] });
    }
  };

  // Policy names are fixed, so drop leftovers of an interrupted run first.
  apiTest.beforeEach(cleanup);

  apiTest.afterEach(cleanup);

  apiTest(
    'creates a policy, rejects a duplicate and overwrites it',
    async ({ apiClient, samlAuth, esClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const policyName = `${POLICY_PREFIX}_upsert`;
      const postPolicy = (body: Record<string, unknown>, allowOverwrite?: boolean) =>
        apiClient.post(
          `internal/streams/lifecycle/_policy${allowOverwrite ? '?allow_overwrite=true' : ''}`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: { name: policyName, ...body },
            responseType: 'json',
          }
        );

      await apiTest.step('creates a new policy', async () => {
        const response = await postPolicy({
          phases: {
            hot: { actions: { rollover: { max_age: '30m' } } },
            warm: { min_age: '5d', actions: {} },
          },
          meta: { managed_by: 'streams' },
          deprecated: false,
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ acknowledged: true });

        const policies = await esClient.ilm.getLifecycle({ name: policyName });
        expect(policies[policyName]).toBeDefined();
      });

      await apiTest.step('returns 409 when the policy exists without allow_overwrite', async () => {
        const response = await postPolicy({
          phases: { hot: { actions: { rollover: { max_age: '30m' } } } },
        });
        expect(response).toHaveStatusCode(409);
      });

      await apiTest.step('overwrites the policy with allow_overwrite=true', async () => {
        const response = await postPolicy(
          {
            phases: {
              hot: { actions: { rollover: { max_age: '2h' } } },
              delete: { min_age: '10d', actions: {} },
            },
            meta: { updated_by: 'streams' },
          },
          true
        );
        expect(response).toHaveStatusCode(200);

        const policies = await esClient.ilm.getLifecycle({ name: policyName });
        expect(policies[policyName]?.policy?.phases?.hot).toBeDefined();
        expect(policies[policyName]?.policy?.phases?.delete).toBeDefined();
      });
    }
  );

  apiTest('rejects policies without phases', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const response = await apiClient.post('internal/streams/lifecycle/_policy', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: { name: `${POLICY_PREFIX}_no_phases`, phases: {} },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('rejects new policies without a hot phase', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const response = await apiClient.post('internal/streams/lifecycle/_policy', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: {
        name: `${POLICY_PREFIX}_no_hot`,
        phases: { warm: { min_age: '5d', actions: {} } },
      },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'includes the data streams that use a policy',
    async ({ apiClient, samlAuth, apiServices, esClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const streamName = `${PREFIX}-usage`;
      const policyName = `${POLICY_PREFIX}_usage`;

      await esClient.ilm.putLifecycle({
        name: policyName,
        policy: { phases: { hot: { actions: { rollover: { max_age: '30m' } } } } },
      });
      await apiServices.streamsTest.createStream(
        streamName,
        wiredUpsertRequest({ lifecycle: { ilm: { policy: policyName } } })
      );
      // Policy usage is derived from backing indices.
      await esClient.indices.rollover({ alias: streamName });

      const response = await apiClient.get('internal/streams/lifecycle/_policies', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const policy = (
        response.body as Array<{ name: string; in_use_by?: { data_streams?: string[] } }>
      ).find(({ name }) => name === policyName);
      expect(policy?.in_use_by?.data_streams).toContain(streamName);
    }
  );
});
