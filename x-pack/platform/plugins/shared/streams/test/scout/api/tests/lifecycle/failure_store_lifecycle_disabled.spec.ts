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
  classicUpsertRequest,
  getStream,
  putStream,
  putWiredFailureStore,
  wiredUpsertRequest,
  createAdminContext,
} from '../../lib/streams';

const ROOT = 'logs.otel';
const PREFIX = `${ROOT}.fslcdisabled`;
const CLASSIC_STREAM = 'classic-fs-lifecycle-disabled';

// Disabling the failure store lifecycle is rejected on serverless, see
// failure_store_lifecycle_disabled_serverless.spec.ts.
apiTest.describe('Failure store - disabled lifecycle', { tag: tags.stateful.classic }, () => {
  let originalRootFailureStore: FailureStore;

  apiTest.beforeAll(async ({ apiServices }) => {
    originalRootFailureStore = (await apiServices.streamsTest.getStream(ROOT)).stream.ingest
      .failure_store;
  });

  apiTest.afterEach(async ({ apiServices }) => {
    try {
      await apiServices.streamsTest.cleanupTestStreams(PREFIX);
      await apiServices.streamsTest.deleteClassicDataStream(CLASSIC_STREAM);
    } finally {
      await apiServices.streamsTest.updateFailureStore(ROOT, originalRootFailureStore);
    }
  });

  apiTest(
    'disables the lifecycle on a wired stream failure store',
    async ({ apiClient, samlAuth, apiServices }) => {
      const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
      const streamName = `${PREFIX}-wired`;
      expect(
        await putStream(
          context,
          streamName,
          wiredUpsertRequest({ failureStore: { lifecycle: { disabled: {} } } })
        )
      ).toHaveStatusCode(200);

      const response = await getStream(context, streamName);
      expect(response).toHaveStatusCode(200);
      expect(response.body.effective_failure_store).toStrictEqual({
        lifecycle: { disabled: {} },
        from: streamName,
      });

      const dataStreams = await context.streamsTest.getDataStreamFailureStore([streamName]);
      expect(dataStreams[streamName]?.enabled).toBe(true);
    }
  );

  apiTest(
    'inherits a disabled lifecycle from the parent',
    async ({ apiClient, samlAuth, apiServices }) => {
      const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
      const parent = `${PREFIX}-parent`;
      const child = `${parent}.child`;

      expect(
        await putStream(
          context,
          parent,
          wiredUpsertRequest({
            failureStore: { lifecycle: { disabled: {} } },
            routing: [{ destination: child, where: { never: {} }, status: 'disabled' }],
          })
        )
      ).toHaveStatusCode(200);
      expect(await putStream(context, child, wiredUpsertRequest())).toHaveStatusCode(200);

      for (const streamName of [parent, child]) {
        const response = await getStream(context, streamName);
        expect(response).toHaveStatusCode(200);
        expect(response.body.effective_failure_store).toStrictEqual({
          lifecycle: { disabled: {} },
          from: parent,
        });
      }
    }
  );

  apiTest(
    'disables the lifecycle on a classic stream failure store',
    async ({ apiClient, samlAuth, apiServices }) => {
      const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
      await context.streamsTest.createClassicDataStream(CLASSIC_STREAM, {
        enabled: true,
        dataRetention: '30d',
      });

      expect(
        await putStream(
          context,
          CLASSIC_STREAM,
          classicUpsertRequest({ lifecycle: { disabled: {} } })
        )
      ).toHaveStatusCode(200);

      const response = await getStream(context, CLASSIC_STREAM);
      expect(response).toHaveStatusCode(200);
      expect(response.body.effective_failure_store).toStrictEqual({ lifecycle: { disabled: {} } });

      const dataStreams = await context.streamsTest.getDataStreamFailureStore([CLASSIC_STREAM]);
      expect(dataStreams[CLASSIC_STREAM]?.lifecycle?.enabled).toBe(false);
    }
  );

  apiTest(
    'disables the lifecycle on the root stream failure store',
    async ({ apiClient, samlAuth, apiServices }) => {
      const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
      expect(
        await putWiredFailureStore(context, ROOT, { lifecycle: { disabled: {} } })
      ).toHaveStatusCode(200);

      const response = await getStream(context, ROOT);
      expect(response).toHaveStatusCode(200);
      expect(response.body.stream.ingest.failure_store).toStrictEqual({
        lifecycle: { disabled: {} },
      });
      expect(response.body.effective_failure_store).toStrictEqual({
        lifecycle: { disabled: {} },
        from: ROOT,
      });

      const dataStreams = await context.streamsTest.getDataStreamFailureStore([ROOT]);
      expect(dataStreams[ROOT]?.enabled).toBe(true);
    }
  );
});
