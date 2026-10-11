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

const NAMESPACE = 'nc_api_read_state_test';

/**
 * Read state is shared per user profile across the suite, so this spec anchors itself:
 * it takes its own mark-all-read baseline in beforeAll and seeds docs relative to that
 * marker, making the assertions immune to read-state writes from other specs.
 *
 * A per-id override only decides the outcome for a copy in the interval `(marker, markedAt]`
 */
apiTest.describe(
  'Notification Center - read-state annotation',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let apiKeyHeader: Record<string, string>;
    const asUser = createHelpers(() => cookieHeader);
    const asApiKey = createHelpers(() => apiKeyHeader);

    const afterMarker = (marker: string, ms: number) =>
      new Date(Date.parse(marker) + ms).toISOString();

    apiTest.beforeAll(async ({ samlAuth, requestAuth, esClient, apiClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ apiKeyHeader } = await requestAuth.getApiKey('admin'));
      // The plugin creates the backing data stream lazily, on the first read. Touch the route
      // before seeding so the bulk write below lands in a data stream, not a conflicting index.
      await asUser.getNotifications(apiClient);

      const markAll = await asUser.markAllRead(apiClient);
      const marker: string = markAll.body.read_all_before;

      await seedNotifications(esClient, [
        // At or before the marker: read via the bulk catch-up.
        makeDoc('rs-caught-up', { namespace: NAMESPACE, '@timestamp': daysAgo(1) }),
        // Re-pushed after the marker: the newest copy postdates it, so the mark-all-read
        // is escaped and the notification resurfaces as unread.
        makeDoc('rs-repushed', { namespace: NAMESPACE, '@timestamp': daysAgo(2) }),
        makeDoc('rs-repushed', {
          namespace: NAMESPACE,
          title: 're-push',
          '@timestamp': afterMarker(marker, 600_000),
        }),
        // Just past the marker, so only the mark-read below can explain them reading as read.
        makeDoc('rs-acknowledged', { namespace: NAMESPACE, '@timestamp': afterMarker(marker, 1) }),
        makeDoc('rs-acked-repushed', {
          namespace: NAMESPACE,
          '@timestamp': afterMarker(marker, 1),
        }),
      ]);

      await asUser.markRead(apiClient, { notification_id: 'rs-acknowledged' });
      await asUser.markRead(apiClient, { notification_id: 'rs-acked-repushed' });
      // A copy pushed after its own mark-read: the override acknowledges the copy in hand,
      // not the id, so this resurfaces as unread.
      await seedNotifications(esClient, [
        makeDoc('rs-acked-repushed', {
          namespace: NAMESPACE,
          title: 're-push after mark-read',
          '@timestamp': afterMarker(marker, 900_000),
        }),
      ]);
    });

    apiTest.afterAll(async ({ esClient }) => {
      await clearNotifications(esClient, NAMESPACE);
    });

    apiTest('annotates isRead against the newest copy', async ({ apiClient }) => {
      const response = await asUser.getNotifications(apiClient, { namespace: NAMESPACE });
      expect(response).toHaveStatusCode(200);

      const items: Array<{ notification_id: string; title: string; isRead: boolean }> =
        response.body.items;
      expect(items.map((item) => [item.notification_id, item.isRead])).toStrictEqual([
        // Unread: one re-push escaped the marker, the other its own mark-read.
        ['rs-acked-repushed', false],
        ['rs-repushed', false],
        // Read: an override recorded after the copy, then the bulk catch-up.
        ['rs-acknowledged', true],
        ['rs-caught-up', true],
      ]);

      const byId = (id: string) => items.find((item) => item.notification_id === id);
      expect(byId('rs-repushed')?.title).toBe('re-push');
      expect(byId('rs-acked-repushed')?.title).toBe('re-push after mark-read');
    });

    apiTest('orders by recency, not by read state', async ({ apiClient }) => {
      const response = await asUser.getNotifications(apiClient, { namespace: NAMESPACE });
      expect(response).toHaveStatusCode(200);

      const timestamps: string[] = response.body.items.map(
        (item: { '@timestamp': string }) => item['@timestamp']
      );
      expect(timestamps).toStrictEqual([...timestamps].sort().reverse());
    });

    apiTest('omits isRead for callers without a user profile', async ({ apiClient }) => {
      const response = await asApiKey.getNotifications(apiClient, { namespace: NAMESPACE });
      expect(response).toHaveStatusCode(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      for (const item of response.body.items) {
        expect('isRead' in item).toBe(false);
      }
    });
  }
);
