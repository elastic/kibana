/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

/**
 * Verifies that the removed /internal/streams/memory/* routes return 404.
 * An accidentally retained or reintroduced handler would fail this suite.
 */
apiTest.describe(
  'Memory API removal contract',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const REMOVED_ENDPOINTS: Array<{ method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string }> = [
      { method: 'GET', path: 'internal/streams/memory' },
      { method: 'POST', path: 'internal/streams/memory' },
      { method: 'GET', path: 'internal/streams/memory/search' },
      { method: 'POST', path: 'internal/streams/memory/search' },
      { method: 'DELETE', path: 'internal/streams/memory/test-id' },
      { method: 'PUT', path: 'internal/streams/memory/test-id' },
    ];

    for (const { method, path } of REMOVED_ENDPOINTS) {
      apiTest(
        `${method} ${path} returns 404`,
        async ({ apiClient, samlAuth }) => {
          const { cookieHeader } = await samlAuth.asStreamsAdmin();
          const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

          const response =
            method === 'GET'
              ? await apiClient.get(path, { headers, responseType: 'json' })
              : method === 'POST'
              ? await apiClient.post(path, { headers, body: {}, responseType: 'json' })
              : method === 'PUT'
              ? await apiClient.put(path, { headers, body: {}, responseType: 'json' })
              : await apiClient.delete(path, { headers, responseType: 'json' });

          expect(response).toHaveStatusCode(404);
        }
      );
    }
  }
);
