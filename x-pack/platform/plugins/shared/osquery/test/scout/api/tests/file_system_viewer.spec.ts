/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleSessionCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

/**
 * API-level coverage for the Files-tab (file-system viewer) internal routes.
 *
 * The feature is behind the `fileSystemViewer` experimental flag, which is OFF
 * by default in the test stack. With the flag off the routes are not registered
 * and return 404 — this spec asserts that gating contract (which IS testable
 * without enrolled osquery agents).
 *
 * The full happy-path (pick host -> expand dir -> see files -> get-file enabled
 * on a capable host) and the >10k-entry truncation path require a live osquery
 * agent and an enabled flag; those are exercised by the Jest unit/route tests
 * (escaper, query construction, `classifyFileListing` truncation, tree states)
 * and would need a flag-enabled fixture + real agent to run end-to-end here.
 * When such a fixture exists, enable the `.skip` blocks below.
 */
apiTest.describe(
  'Osquery file-system viewer routes',
  {
    tag: ['@local-stateful-classic', ...tags.serverless.security.complete],
  },
  () => {
    let adminCredentials: RoleSessionCredentials;

    const internalHeaders = (creds: RoleSessionCredentials) => ({
      ...testData.COMMON_HEADERS,
      'elastic-api-version': '1',
      ...creds.cookieHeader,
    });

    apiTest.beforeAll(async ({ samlAuth }) => {
      adminCredentials = await samlAuth.asInteractiveUser('admin');
    });

    apiTest('directory-listing route is gated off by default (404)', async ({ apiClient }) => {
      const response = await apiClient.post(testData.API_PATHS.OSQUERY_FILE_SYSTEM_LIST, {
        headers: internalHeaders(adminCredentials),
        body: { agentId: 'any-agent', path: '/etc' },
        responseType: 'json',
      });

      // Flag off -> route not registered -> 404. (Never 200/400/403, which would
      // mean the gating regressed and the feature shipped enabled by default.)
      expect(response.statusCode).toBe(404);
    });

    apiTest('roots-discovery route is gated off by default (404)', async ({ apiClient }) => {
      const response = await apiClient.post(testData.API_PATHS.OSQUERY_FILE_SYSTEM_ROOTS, {
        headers: internalHeaders(adminCredentials),
        body: { agentId: 'any-agent', osFamily: 'linux' },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(404);
    });

    // Enable once a `fileSystemViewer`-enabled fixture + an enrolled osquery agent
    // are available in the test stack.
    apiTest.skip('happy path: list a directory on a host (flag enabled)', async () => {
      // pick host -> POST /list -> poll results -> assert file rows -> on a
      // Defend-capable host, get-file action is permitted.
    });

    apiTest.skip('scale: a >10k-entry directory reports truncation without crashing', async () => {
      // Seed a directory exceeding FILE_LISTING_WINDOW_CEILING and assert the
      // listing reports `truncated: true` and the server does not error.
    });
  }
);
