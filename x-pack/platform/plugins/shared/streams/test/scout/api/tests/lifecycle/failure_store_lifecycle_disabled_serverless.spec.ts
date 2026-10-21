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
  putStream,
  putWiredFailureStore,
  wiredUpsertRequest,
  createAdminContext,
} from '../../lib/streams';

const ROOT = 'logs.otel';
const PREFIX = `${ROOT}.fslcdisabled`;
const CLASSIC_STREAM = 'classic-fs-lifecycle-disabled';

apiTest.describe(
  'Failure store - disabled lifecycle is rejected',
  {
    tag: [
      ...tags.serverless.search,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    // Every update here should be rejected; the restore only matters if that regresses.
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
      'rejects disabling the lifecycle on a wired stream',
      async ({ apiClient, samlAuth, apiServices }) => {
        const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
        const response = await putStream(
          context,
          `${PREFIX}-wired`,
          wiredUpsertRequest({ failureStore: { lifecycle: { disabled: {} } } })
        );
        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'rejects disabling the lifecycle on a parent wired stream',
      async ({ apiClient, samlAuth, apiServices }) => {
        const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
        const parent = `${PREFIX}-parent`;
        const response = await putStream(
          context,
          parent,
          wiredUpsertRequest({
            failureStore: { lifecycle: { disabled: {} } },
            routing: [{ destination: `${parent}.child`, where: { never: {} }, status: 'disabled' }],
          })
        );
        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'rejects disabling the lifecycle on a classic stream',
      async ({ apiClient, samlAuth, apiServices }) => {
        const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
        await context.streamsTest.createClassicDataStream(CLASSIC_STREAM, {
          enabled: true,
          dataRetention: '30d',
        });

        const response = await putStream(
          context,
          CLASSIC_STREAM,
          classicUpsertRequest({ lifecycle: { disabled: {} } })
        );
        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'rejects disabling the lifecycle on the root stream',
      async ({ apiClient, samlAuth, apiServices }) => {
        const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
        const response = await putWiredFailureStore(context, ROOT, { lifecycle: { disabled: {} } });
        expect(response).toHaveStatusCode(400);
      }
    );
  }
);
