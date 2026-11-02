/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { FailureStore } from '@kbn/streams-schema';
import { streamsApiTest as apiTest } from '../../fixtures';
import {
  expectFailureStore,
  getStream,
  putStream,
  putWiredFailureStore,
  wiredUpsertRequest,
  createAdminContext,
} from '../../lib/streams';

const ROOT = 'logs.otel';
const PREFIX = `${ROOT}.fsroot`;

apiTest.describe('Failure store - root stream', { tag: tags.deploymentAgnostic }, () => {
  let originalRootFailureStore: FailureStore;

  apiTest.beforeAll(async ({ apiServices }) => {
    originalRootFailureStore = (await apiServices.streamsTest.getStream(ROOT)).stream.ingest
      .failure_store;
  });

  apiTest.afterEach(async ({ apiServices }) => {
    try {
      await apiServices.streamsTest.cleanupTestStreams(PREFIX);
    } finally {
      await apiServices.streamsTest.updateFailureStore(ROOT, originalRootFailureStore);
    }
  });

  apiTest(
    'updates the root failure store configuration',
    async ({ apiClient, samlAuth, apiServices }) => {
      const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
      const response = await putWiredFailureStore(context, ROOT, {
        lifecycle: { enabled: { data_retention: '60d' } },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.acknowledged).toBe(true);

      const root = await getStream(context, ROOT);
      expect(root).toHaveStatusCode(200);
      expect(root.body.stream.ingest.failure_store).toStrictEqual({
        lifecycle: { enabled: { data_retention: '60d' } },
      });

      await expectFailureStore(context, [ROOT], {
        lifecycle: { enabled: { data_retention: '60d', is_default_retention: false } },
        from: ROOT,
      });
    }
  );

  apiTest(
    'inherits the root failure store on creation',
    async ({ apiClient, samlAuth, apiServices }) => {
      const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
      const child = `${PREFIX}-inherits`;
      const rootResponse = await putWiredFailureStore(context, ROOT, {
        lifecycle: { enabled: { data_retention: '45d' } },
      });
      expect(rootResponse).toHaveStatusCode(200);

      const childResponse = await putStream(context, child, wiredUpsertRequest());
      expect(childResponse).toHaveStatusCode(200);

      await expectFailureStore(context, [child], {
        lifecycle: { enabled: { data_retention: '45d', is_default_retention: false } },
        from: ROOT,
      });
    }
  );

  apiTest(
    'applies the root failure store to inheriting streams only',
    async ({ apiClient, samlAuth, apiServices }) => {
      const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
      const inherits = `${PREFIX}-inherits`;
      const overrides = `${PREFIX}-overrides`;

      for (const [name, body] of [
        [inherits, wiredUpsertRequest()],
        [`${inherits}.child`, wiredUpsertRequest()],
        [
          overrides,
          wiredUpsertRequest({
            failureStore: { lifecycle: { enabled: { data_retention: '15d' } } },
            routing: [
              { destination: `${overrides}.child`, where: { never: {} }, status: 'disabled' },
            ],
          }),
        ],
        [`${overrides}.child`, wiredUpsertRequest()],
      ] as const) {
        expect(await putStream(context, name, body)).toHaveStatusCode(200);
      }

      const rootResponse = await putWiredFailureStore(context, ROOT, {
        lifecycle: { enabled: { data_retention: '90d' } },
      });
      expect(rootResponse).toHaveStatusCode(200);

      await expectFailureStore(context, [inherits, `${inherits}.child`], {
        lifecycle: { enabled: { data_retention: '90d', is_default_retention: false } },
        from: ROOT,
      });
      await expectFailureStore(context, [overrides, `${overrides}.child`], {
        lifecycle: { enabled: { data_retention: '15d', is_default_retention: false } },
        from: overrides,
      });
    }
  );

  apiTest(
    'stores an updated root failure store retention',
    async ({ apiClient, samlAuth, apiServices }) => {
      const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
      const response = await putWiredFailureStore(context, ROOT, {
        lifecycle: { enabled: { data_retention: '120d' } },
      });
      expect(response).toHaveStatusCode(200);

      const root = await getStream(context, ROOT);
      expect(root).toHaveStatusCode(200);
      expect(root.body.stream.ingest.failure_store).toStrictEqual({
        lifecycle: { enabled: { data_retention: '120d' } },
      });
    }
  );
});
