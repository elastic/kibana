/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The `/spaces/enter` view route issues a server-side redirect whose `Location`
 * header is derived from the `next` query param (falling back to the space's
 * `defaultRoute`). This suite exercises the URL normalization/sanitization
 * behavior at the HTTP layer: malformed/external `next` rejection, `../`
 * traversal normalization, and query/hash preservation. The pure input→output
 * logic is also covered by the route's unit test
 * (`server/routes/views/index.test.ts`); this API test verifies parity against
 * a running server with real space-scoped `defaultRoute` settings.
 */

import type { ApiClientFixture, KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../constants';
import { apiTest } from '../fixtures';

const SPACE_ID = 'enter-routing-space';
const CANVAS_ROUTE = '/app/canvas';

const setDefaultRoute = (kbnClient: KbnClient, defaultRoute: string) =>
  kbnClient.uiSettings.replace(
    { defaultRoute, buildNum: 8467, 'dateFormat:tz': 'UTC' },
    { space: SPACE_ID }
  );

apiTest.describe('Enter space redirect routing', { tag: tags.deploymentAgnostic }, () => {
  let cookieHeader: Record<string, string>;

  const enterSpace = async (apiClient: ApiClientFixture, next?: string) => {
    const query = next === undefined ? '' : `?next=${encodeURIComponent(next)}`;
    const response = await apiClient.get(`s/${SPACE_ID}/spaces/enter${query}`, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });
    expect(response).toHaveStatusCode(302);
    return String(response.headers.location);
  };

  apiTest.beforeAll(async ({ apiServices, samlAuth, kbnClient }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
    await apiServices.spaces.create({ id: SPACE_ID, name: 'Enter Routing Space' });
    await setDefaultRoute(kbnClient, CANVAS_ROUTE);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(SPACE_ID);
  });

  apiTest(
    'redirects to the space default route when no next route is provided',
    async ({ apiClient, kbnClient }) => {
      await setDefaultRoute(kbnClient, CANVAS_ROUTE);
      const location = await enterSpace(apiClient);
      expect(location).toContain(`/s/${SPACE_ID}${CANVAS_ROUTE}`);
    }
  );

  apiTest('redirects to a valid provided next route', async ({ apiClient }) => {
    const location = await enterSpace(apiClient, '/app/management/kibana/objects');
    expect(location).toContain(`/s/${SPACE_ID}/app/management/kibana/objects`);
  });

  apiTest('normalizes a next route containing path traversal segments', async ({ apiClient }) => {
    const location = await enterSpace(apiClient, '/../../../app/management/kibana/objects');
    expect(location).toContain(`/s/${SPACE_ID}/app/management/kibana/objects`);
    expect(location).not.toContain('..');
  });

  apiTest(
    'falls back to the default route when next is an external URL',
    async ({ apiClient, kbnClient }) => {
      await setDefaultRoute(kbnClient, CANVAS_ROUTE);
      const location = await enterSpace(apiClient, 'http://example.com/evil');
      expect(location).toContain(`/s/${SPACE_ID}${CANVAS_ROUTE}`);
      expect(location).not.toContain('example.com');
    }
  );

  apiTest(
    'preserves the query string and hash of the provided next route',
    async ({ apiClient }) => {
      const location = await enterSpace(
        apiClient,
        '/app/management/kibana/objects?initialQuery=type:(visualization)#/view/uuid'
      );
      expect(location).toContain(`/s/${SPACE_ID}/app/management/kibana/objects`);
      expect(location).toContain('initialQuery=type:(visualization)');
      expect(location).toContain('#/view/uuid');
    }
  );

  apiTest(
    'preserves the query string and hash of the default route',
    async ({ apiClient, kbnClient }) => {
      await setDefaultRoute(
        kbnClient,
        '/app/management/kibana/objects?initialQuery=type:(visualization)#/view'
      );
      const location = await enterSpace(apiClient);
      expect(location).toContain(`/s/${SPACE_ID}/app/management/kibana/objects`);
      expect(location).toContain('initialQuery=type:(visualization)');
      expect(location).toContain('#/view');
    }
  );
});
