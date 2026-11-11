/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { streamsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';
import { wiredUpsertRequest } from '../../lib/streams';

const PREFIX = 'logs.otel.dslstats';

apiTest.describe('Lifecycle stats - DSL streams', { tag: tags.deploymentAgnostic }, () => {
  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.streamsTest.cleanupTestStreams(PREFIX);
  });

  apiTest(
    'does not return ILM stats for a stream with a DSL lifecycle',
    async ({ apiClient, samlAuth, apiServices }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const streamName = `${PREFIX}-nostats`;
      await apiServices.streamsTest.createStream(
        streamName,
        wiredUpsertRequest({ lifecycle: { dsl: { data_retention: '1d' } } })
      );

      const response = await apiClient.get(`internal/streams/${streamName}/lifecycle/_stats`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    }
  );
});
