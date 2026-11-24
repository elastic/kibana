/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { StreamsApiServicesFixture } from '../../fixtures';
import { streamsApiTest as apiTest } from '../../fixtures';
import {
  classicUpsertRequest,
  createAdminContext,
  expectFailureStore,
  putStream,
} from '../../lib/streams';

const PREFIX = 'classic-fs';
const STREAMS = ['inherit', 'override', 'disable', 'update-retention'].map(
  (suffix) => `${PREFIX}-${suffix}`
);

apiTest.describe('Failure store - classic streams', { tag: tags.deploymentAgnostic }, () => {
  const cleanup = async ({ apiServices }: { apiServices: StreamsApiServicesFixture }) => {
    for (const name of STREAMS) {
      await apiServices.streamsTest.deleteClassicDataStream(name);
    }
  };

  apiTest.beforeEach(cleanup);

  apiTest.afterEach(cleanup);

  apiTest(
    'inherit defaults to disabled without an index template failure store',
    async ({ apiClient, samlAuth, apiServices }) => {
      const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
      const streamName = `${PREFIX}-inherit`;
      await context.streamsTest.createClassicDataStream(streamName, { enabled: false });

      await apiTest.step('inherit resolves to a disabled failure store', async () => {
        expect(
          await putStream(context, streamName, classicUpsertRequest({ inherit: {} }))
        ).toHaveStatusCode(200);
        await expectFailureStore(context, [streamName], { disabled: {} });
      });

      await apiTest.step('an explicit failure store can be set', async () => {
        expect(
          await putStream(
            context,
            streamName,
            classicUpsertRequest({ lifecycle: { enabled: { data_retention: '5d' } } })
          )
        ).toHaveStatusCode(200);
        await expectFailureStore(context, [streamName], {
          lifecycle: { enabled: { data_retention: '5d', is_default_retention: false } },
        });
      });

      await apiTest.step('inherit resets to the default disabled state', async () => {
        expect(
          await putStream(context, streamName, classicUpsertRequest({ inherit: {} }))
        ).toHaveStatusCode(200);
        await expectFailureStore(context, [streamName], { disabled: {} });
      });
    }
  );

  apiTest(
    'overrides the index template failure store',
    async ({ apiClient, samlAuth, apiServices }) => {
      const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
      const streamName = `${PREFIX}-override`;
      await context.streamsTest.createClassicDataStream(streamName, {
        enabled: true,
        dataRetention: '30d',
      });

      expect(
        await putStream(
          context,
          streamName,
          classicUpsertRequest({ lifecycle: { enabled: { data_retention: '10d' } } })
        )
      ).toHaveStatusCode(200);

      await expectFailureStore(context, [streamName], {
        lifecycle: { enabled: { data_retention: '10d', is_default_retention: false } },
      });
    }
  );

  apiTest('disables the failure store', async ({ apiClient, samlAuth, apiServices }) => {
    const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
    const streamName = `${PREFIX}-disable`;
    await context.streamsTest.createClassicDataStream(streamName, {
      enabled: true,
      dataRetention: '30d',
    });

    expect(
      await putStream(context, streamName, classicUpsertRequest({ disabled: {} }))
    ).toHaveStatusCode(200);

    await expectFailureStore(context, [streamName], { disabled: {} });
  });

  apiTest('updates the failure store retention', async ({ apiClient, samlAuth, apiServices }) => {
    const context = await createAdminContext(apiClient, samlAuth, apiServices.streamsTest);
    const streamName = `${PREFIX}-update-retention`;
    await context.streamsTest.createClassicDataStream(streamName, {
      enabled: true,
      dataRetention: '20d',
    });

    for (const dataRetention of ['7d', '30d']) {
      expect(
        await putStream(
          context,
          streamName,
          classicUpsertRequest({ lifecycle: { enabled: { data_retention: dataRetention } } })
        )
      ).toHaveStatusCode(200);

      await expectFailureStore(context, [streamName], {
        lifecycle: { enabled: { data_retention: dataRetention, is_default_retention: false } },
      });
    }
  });
});
