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
 * marker (pre-marker docs read, post-marker docs unread), making the assertions immune
 * to read-state writes from other specs.
 */
apiTest.describe(
  'Notification Center - read-state annotation',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let apiKeyHeader: Record<string, string>;
    const asUser = createHelpers(() => cookieHeader);
    const asApiKey = createHelpers(() => apiKeyHeader);

    const afterMarker = (marker: string, seconds: number) =>
      new Date(Date.parse(marker) + seconds * 1000).toISOString();

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
        makeDoc('rs-before-marker', { namespace: NAMESPACE, '@timestamp': daysAgo(1) }),
        // Re-pushed after the marker: the newest copy postdates it, so the mark-all-read
        // is escaped and the notification resurfaces as unread.
        makeDoc('rs-repushed', { namespace: NAMESPACE, '@timestamp': daysAgo(2) }),
        makeDoc('rs-repushed', {
          namespace: NAMESPACE,
          title: 're-push',
          '@timestamp': afterMarker(marker, 600),
        }),
        // Newer than the marker but individually acknowledged below: read via the durable list.
        makeDoc('rs-muted', { namespace: NAMESPACE, '@timestamp': afterMarker(marker, 300) }),
      ]);

      await asUser.markRead(apiClient, { notification_id: 'rs-muted' });
      // A second bulk catch-up must not clear the individual acknowledgement: `rs-muted`
      // postdates this marker too, so only the durable list can explain it reading as read.
      await asUser.markAllRead(apiClient);
    });

    apiTest.afterAll(async ({ esClient }) => {
      await clearNotifications(esClient, NAMESPACE);
    });

    apiTest(
      'annotates isRead against the newest copy and sorts unread first',
      async ({ apiClient }) => {
        const response = await asUser.getNotifications(apiClient, { namespace: NAMESPACE });
        expect(response).toHaveStatusCode(200);

        const annotated = response.body.items.map(
          (item: { notification_id: string; isRead: boolean }) => [
            item.notification_id,
            item.isRead,
          ]
        );
        expect(annotated).toStrictEqual([
          // Unread first: the re-push escaped both mark-all-reads.
          ['rs-repushed', false],
          // Read, newest first: the acknowledgement survived a later mark-all-read.
          ['rs-muted', true],
          ['rs-before-marker', true],
        ]);

        const repushed = response.body.items.find(
          (item: { notification_id: string }) => item.notification_id === 'rs-repushed'
        );
        expect(repushed.title).toBe('re-push');
      }
    );

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
