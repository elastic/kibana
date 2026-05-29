/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { streamsApiTest as apiTest } from '../../fixtures';
import { PUBLIC_API_HEADERS } from '../../fixtures/constants';

apiTest.describe(
  'POST /internal/streams/significant_events/discovery/_run',
  { tag: [...tags.stateful.classic] },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.streamsTest.enable();
      await apiServices.streamsTest.enableSignificantEvents();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.streamsTest.disableSignificantEvents();
      await apiServices.streamsTest.disable();
    });

    apiTest('returns an executionId when triggered manually', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode, body } = await apiClient.post(
        'internal/streams/significant_events/discovery/_run',
        {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {},
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body).toHaveProperty('executionId');
      expect(typeof body.executionId).toBe('string');
    });
  }
);
