/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import {
  createHelpers,
  daysAgo,
  makeDoc,
  seedNotifications,
  clearNotifications,
} from '../fixtures/helpers';

// A suite-private namespace keeps these docs from colliding with anything else in the
// shared data stream, and lets the namespace filter scope every assertion to seeded data.
const NAMESPACE = 'nc_api_get_test';

const ids = (body: { items: Array<{ notification_id: string }> }) =>
  body.items.map((item) => item.notification_id);

apiTest.describe(
  'Notification Center - GET notifications',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    const h = createHelpers(() => cookieHeader);

    apiTest.beforeAll(async ({ samlAuth, esClient, apiClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      // The plugin creates the backing data stream lazily, on the first read. Touch the route
      // before seeding: a direct bulk write to a name with no data stream behind it makes ES
      // auto-create a plain index, and the plugin's later data-stream creation then fails with
      // a name conflict.
      await h.getNotifications(apiClient);
      await seedNotifications(esClient, [
        makeDoc('get-info', { namespace: NAMESPACE, severity: 'info' }),
        makeDoc('get-warning', { namespace: NAMESPACE, severity: 'warning' }),
        makeDoc('get-error', { namespace: NAMESPACE, severity: 'error' }),
        // Same id twice: the newest doc must be the one surfaced after collapse.
        makeDoc('get-dup', { namespace: NAMESPACE, title: 'dup v1', '@timestamp': daysAgo(3) }),
        makeDoc('get-dup', { namespace: NAMESPACE, title: 'dup v2', '@timestamp': daysAgo(1) }),
      ]);
    });

    apiTest.afterAll(async ({ esClient }) => {
      await clearNotifications(esClient, NAMESPACE);
    });

    apiTest('returns the { items, truncated } contract', async ({ apiClient }) => {
      const response = await h.getNotifications(apiClient);
      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(typeof response.body.truncated).toBe('boolean');
    });

    apiTest(
      'surfaces seeded notifications, collapsed to the newest doc per id',
      async ({ apiClient }) => {
        const response = await h.getNotifications(apiClient, { namespace: NAMESPACE });
        expect(response).toHaveStatusCode(200);
        expect(ids(response.body).sort()).toStrictEqual([
          'get-dup',
          'get-error',
          'get-info',
          'get-warning',
        ]);
        const dup = response.body.items.find(
          (item: { notification_id: string }) => item.notification_id === 'get-dup'
        );
        expect(dup.title).toBe('dup v2');
        expect(response.body.truncated).toBe(false);
      }
    );

    apiTest('returns severity on each item for consumers to facet on', async ({ apiClient }) => {
      const response = await h.getNotifications(apiClient, { namespace: NAMESPACE });
      expect(response).toHaveStatusCode(200);

      const bySeverity = response.body.items
        .filter((item: { severity: string }) => item.severity === 'warning')
        .map((item: { notification_id: string }) => item.notification_id);
      expect(bySeverity).toStrictEqual(['get-warning']);
    });

    apiTest('rejects an unknown query parameter', async ({ apiClient }) => {
      const response = await h.getNotifications(apiClient, { unexpected: 'value' });
      expect(response).toHaveStatusCode(400);
    });
  }
);
