/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { EsTestCluster } from '@kbn/test';
import { createEsClientForTesting, createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import type { NotificationDocument } from '../../common/types';
import { NOTIFICATION_DATA_STREAM_NAME } from '../storage/notification_data_stream';
import { queryNotifications } from '../lib/query_notifications';
import { queryUnreadStatus } from '../lib/query_unread_status';
import type { NotificationReadState } from '../lib/read_state';
import { cleanupExpiredNotifications } from '../cleanup_task/cleanup_expired_notifications';

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const doc = (
  id: string,
  timestamp: string,
  overrides: Partial<NotificationDocument> = {}
): NotificationDocument => ({
  '@timestamp': timestamp,
  notification_id: id,
  namespace: 'inference',
  type: 'modelStatus',
  title: `Title for ${id}`,
  description: `Description for ${id}`,
  severity: 'info',
  ...overrides,
});

describe('queryNotifications [integration]', () => {
  let esServer: EsTestCluster;
  let esClient: ReturnType<typeof createEsClientForTesting>;
  let seedNotifications: (documents: NotificationDocument[]) => Promise<void>;
  const logger = loggingSystemMock.createLogger();

  const query = (
    params: Parameters<typeof queryNotifications>[1] = {},
    readState?: NotificationReadState
  ) => queryNotifications({ esClient, logger }, params, readState);

  beforeAll(async () => {
    jest.setTimeout(120_000);
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'error' }),
    });
    await esServer.start();
    esClient = createEsClientForTesting({
      esUrl: esServer.getHostUrls()[0],
      // Elasticsearch serves a system data stream only to a caller sending a product origin.
      // Core's client always sends it, which is why the plugin itself never has to.
      headers: { 'x-elastic-product-origin': 'kibana' },
    });

    seedNotifications = async (documents: NotificationDocument[]) => {
      const response = await esClient.bulk({
        index: NOTIFICATION_DATA_STREAM_NAME,
        refresh: true,
        operations: documents.flatMap((document) => [{ create: {} }, document]),
      });
      if (response.errors) {
        const reason = response.items.find((item) => item.create?.error)?.create?.error?.reason;
        throw new Error(`Failed to seed notifications: ${reason ?? 'unknown error'}`);
      }
    };
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  // Nothing in Kibana creates the data stream: Elasticsearch builds it from its descriptor when a
  // producer submits the first notification. Until then both read paths must come back empty
  // rather than surfacing `index_not_found_exception` as a 500.
  it('reads an empty result before any producer has created the stream', async () => {
    await expect(query()).resolves.toEqual({ items: [], truncated: false });
    await expect(
      queryUnreadStatus({ esClient, logger }, { overrides: {}, readAllBefore: daysAgo(365) })
    ).resolves.toEqual({ hasUnread: false });
  });

  describe('once notifications have been written', () => {
    beforeAll(async () => {
      await seedNotifications([
        // re-pushed id: collapse must surface only the latest doc
        doc('dup', daysAgo(5), { title: 'dup v1' }),
        doc('dup', daysAgo(2), { title: 'dup v2' }),
        // past the 30d info TTL: horizon-excluded
        doc('old-info', daysAgo(40)),
        // same age but error tier (180d TTL): visible
        doc('old-error', daysAgo(40), { severity: 'error' }),
        doc('recent-warning', daysAgo(1), { severity: 'warning' }),
        doc('other-type', daysAgo(3), { type: 'other' }),
        // one copy past the info TTL, one inside: the in-horizon copy represents the group
        doc('revived', daysAgo(40), { title: 'revived v1' }),
        doc('revived', daysAgo(1.5), { title: 'revived v2' }),
      ]);
    });

    it('returns each notification_id once, represented by its latest doc, newest first', async () => {
      const { items, truncated } = await query();

      expect(items.map(({ notification_id: id }) => id)).toEqual([
        'recent-warning',
        'revived',
        'dup',
        'other-type',
        'old-error',
        'old-info',
      ]);
      expect(items.find(({ notification_id: id }) => id === 'dup')?.title).toBe('dup v2');
      expect(truncated).toBe(false);
    });

    it('returns documents past their severity TTL until cleanup runs', async () => {
      const { items } = await query();

      const ids = items.map(({ notification_id: id }) => id);
      expect(ids).toContain('old-info');
      expect(ids).toContain('old-error');
    });

    it('composes attribute filters', async () => {
      const byType = await query({ type: 'other' });
      expect(byType.items.map(({ notification_id: id }) => id)).toEqual(['other-type']);

      const byNamespace = await query({ namespace: 'nonexistent' });
      expect(byNamespace.items).toEqual([]);
    });

    it('includes any notification with in-window activity, represented by its newest in-window copy', async () => {
      const { items } = await query({ from: daysAgo(6), to: daysAgo(3) });

      // `dup` was re-pushed after the window closed, but its 5d copy is in-window, so it
      // appears here represented by that copy — not dropped, and not shown as `dup v2`.
      expect(items.map(({ notification_id: id }) => id)).toEqual(['other-type', 'dup']);
      expect(items.find(({ notification_id: id }) => id === 'dup')?.title).toBe('dup v1');
    });

    it('annotates isRead from the representative without reordering', async () => {
      const { items } = await query(
        {},
        {
          overrides: { 'recent-warning': { read: true, markedAt: new Date().toISOString() } },
          readAllBefore: daysAgo(3),
        }
      );

      // Strictly newest-first, read and unread interleaved.
      expect(items.map(({ notification_id: id, isRead }) => [id, isRead])).toEqual([
        // Postdates the marker, but its own override was recorded later still.
        ['recent-warning', true],
        // Re-pushed after the marker, so the bulk catch-up is escaped.
        ['revived', false],
        ['dup', false],
        // Predate the marker.
        ['other-type', true],
        ['old-error', true],
        ['old-info', true],
      ]);
    });

    it('reports unread status from the same read state as the list', async () => {
      const result = await queryUnreadStatus(
        { esClient, logger },
        {
          overrides: {
            'recent-warning': { read: true, markedAt: new Date().toISOString() },
          },
          readAllBefore: daysAgo(3),
        }
      );

      // `recent-warning` is the newest group but is overridden as read, so the scan looks past it.
      expect(result).toEqual({ hasUnread: true });
    });

    it('leaves items unannotated when there is no read state', async () => {
      const { items } = await query();

      expect(items.every((item) => !('isRead' in item))).toBe(true);
      // An all-unread annotation is still an annotation: `isRead: false` everywhere, not absent
      const annotated = await query({}, { overrides: {}, readAllBefore: daysAgo(365) });
      expect(annotated.items.every(({ isRead }) => isRead === false)).toBe(true);
    });

    it('cleans an expired group through its newest expired copy while preserving newer copies', async () => {
      await seedNotifications([
        doc('cleanup-downgrade', daysAgo(45), { severity: 'error', title: 'older error' }),
        doc('cleanup-downgrade', daysAgo(35), { title: 'expired info' }),
        doc('cleanup-live', daysAgo(45), { severity: 'error', title: 'older error' }),
        doc('cleanup-live', daysAgo(35), { title: 'expired info' }),
        doc('cleanup-live', daysAgo(1), { severity: 'warning', title: 'fresh warning' }),
        doc('cleanup-long-lived', daysAgo(45), { severity: 'error' }),
      ]);
      await esClient.indices.refresh({ index: NOTIFICATION_DATA_STREAM_NAME });

      await cleanupExpiredNotifications(esClient, new AbortController().signal);
      await esClient.indices.refresh({ index: NOTIFICATION_DATA_STREAM_NAME });

      const response = await esClient.search<NotificationDocument>({
        index: NOTIFICATION_DATA_STREAM_NAME,
        size: 10,
        query: {
          terms: {
            notification_id: ['cleanup-downgrade', 'cleanup-live', 'cleanup-long-lived'],
          },
        },
      });
      const remaining = response.hits.hits.flatMap((hit) => (hit._source ? [hit._source] : []));

      expect(remaining.filter(({ notification_id: id }) => id === 'cleanup-downgrade')).toEqual([]);
      expect(remaining.filter(({ notification_id: id }) => id === 'cleanup-live')).toEqual([
        expect.objectContaining({ title: 'fresh warning' }),
      ]);
      expect(
        remaining.filter(({ notification_id: id }) => id === 'cleanup-long-lived')
      ).toHaveLength(1);
    });
  });
});
