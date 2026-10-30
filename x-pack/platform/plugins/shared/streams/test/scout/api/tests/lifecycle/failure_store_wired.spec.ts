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
  createAdminContext,
  expectFailureStore,
  putStream,
  wiredUpsertRequest,
} from '../../lib/streams';

const PREFIX = 'logs.otel.fswired';

apiTest.describe('Failure store - wired streams', { tag: tags.deploymentAgnostic }, () => {
  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.streamsTest.cleanupTestStreams(PREFIX);
  });

  apiTest('disables the failure store', async ({ apiClient, samlAuth, apiServices }) => {
    const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
    const streamName = `${PREFIX}-disabled`;
    const response = await putStream(
      context,
      streamName,
      wiredUpsertRequest({ failureStore: { disabled: {} } })
    );
    expect(response).toHaveStatusCode(200);

    await expectFailureStore(context, [streamName], { disabled: {}, from: streamName });
  });

  apiTest(
    'applies the nearest parent failure store when reset to inherit',
    async ({ apiClient, samlAuth, apiServices }) => {
      const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
      const top = `${PREFIX}-30d`;
      const middle = `${top}.fs-60d`;
      const leaf = `${middle}.inherits`;

      for (const [name, body] of [
        [
          top,
          wiredUpsertRequest({
            failureStore: { lifecycle: { enabled: { data_retention: '30d' } } },
          }),
        ],
        [
          middle,
          wiredUpsertRequest({
            failureStore: { lifecycle: { enabled: { data_retention: '60d' } } },
          }),
        ],
        [leaf, wiredUpsertRequest()],
      ] as const) {
        expect(await putStream(context, name, body)).toHaveStatusCode(200);
      }

      await expectFailureStore(context, [leaf], {
        lifecycle: { enabled: { data_retention: '60d', is_default_retention: false } },
        from: middle,
      });

      const resetResponse = await putStream(
        context,
        middle,
        wiredUpsertRequest({
          routing: [{ destination: leaf, where: { never: {} }, status: 'disabled' }],
        })
      );
      expect(resetResponse).toHaveStatusCode(200);

      await expectFailureStore(context, [top, middle, leaf], {
        lifecycle: { enabled: { data_retention: '30d', is_default_retention: false } },
        from: top,
      });
    }
  );

  apiTest(
    'enables the failure store with a lifecycle',
    async ({ apiClient, samlAuth, apiServices }) => {
      const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
      const streamName = `${PREFIX}-with-lifecycle`;
      const response = await putStream(
        context,
        streamName,
        wiredUpsertRequest({ failureStore: { lifecycle: { enabled: { data_retention: '7d' } } } })
      );
      expect(response).toHaveStatusCode(200);

      await expectFailureStore(context, [streamName], {
        lifecycle: { enabled: { data_retention: '7d', is_default_retention: false } },
        from: streamName,
      });
    }
  );

  apiTest('updates the failure store retention', async ({ apiClient, samlAuth, apiServices }) => {
    const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
    const streamName = `${PREFIX}-update-retention`;

    for (const dataRetention of ['10d', '20d']) {
      const response = await putStream(
        context,
        streamName,
        wiredUpsertRequest({
          failureStore: { lifecycle: { enabled: { data_retention: dataRetention } } },
        })
      );
      expect(response).toHaveStatusCode(200);

      await expectFailureStore(context, [streamName], {
        lifecycle: { enabled: { data_retention: dataRetention, is_default_retention: false } },
        from: streamName,
      });
    }
  });
});
