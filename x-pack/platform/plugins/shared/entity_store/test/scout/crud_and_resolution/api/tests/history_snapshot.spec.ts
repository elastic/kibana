/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { hashEuid } from '../../../../../common/domain/euid';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_ALIAS,
} from '../../../common/fixtures/constants';
import {
  getHistorySnapshotIndexName,
  getLegacySecurityHistorySnapshotIndexName,
} from '../../../../../server/domain/asset_manager/history_snapshot_index';
import {
  clearInstalledEntityStoreDocuments,
  forceLogExtraction,
  setupLogsTestDataStream,
  stopEntityTypes,
  startEntityTypes,
  teardownLogsTestDataStream,
} from '../../../common/fixtures/helpers';

apiTest.describe('Entity Store History Snapshot', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, apiClient, esClient, esArchiver }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
    internalHeaders = {
      ...credentials.cookieHeader,
      ...INTERNAL_HEADERS,
    };
    await clearInstalledEntityStoreDocuments(esClient);
    // Snapshot frequency is irrelevant here; this test uses FORCE_HISTORY_SNAPSHOT directly.
    const startResponse = await startEntityTypes(apiClient, defaultHeaders, ['host']);
    expect(startResponse.statusCode).toBe(200);

    await setupLogsTestDataStream(esClient);
    await esArchiver.loadIfNeeded(
      'x-pack/platform/plugins/shared/entity_store/test/scout/common/es_archives/logs'
    );
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    try {
      const stopResponse = await stopEntityTypes(apiClient, defaultHeaders, ['host']);
      expect(stopResponse.statusCode).toBe(200);
    } finally {
      try {
        const startMaintainerResponse = await apiClient.put(
          ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_START('automated-resolution'),
          {
            headers: internalHeaders,
            responseType: 'json',
            body: {},
          }
        );
        expect(startMaintainerResponse.statusCode).toBe(200);
      } finally {
        await teardownLogsTestDataStream(esClient);
      }
    }
  });

  apiTest(
    'history snapshot: copies latest to a stamped history index and leaves latest unchanged',
    async ({ apiClient, esClient }) => {
      await forceLogExtraction(
        apiClient,
        internalHeaders,
        'host',
        '2026-01-20T11:00:00Z',
        '2026-01-20T13:00:00Z'
      );

      // Behaviors are managed fields, not populated by log extraction. Seed them directly.
      await esClient.update({
        index: LATEST_ALIAS,
        id: hashEuid('host:host-123'),
        refresh: 'wait_for',
        doc: {
          entity: { behaviors: { rule_names: ['rule-a', 'rule-b'], anomaly_job_ids: ['job-1'] } },
        },
      });
      await esClient.update({
        index: LATEST_ALIAS,
        id: hashEuid('host:server-01'),
        refresh: 'wait_for',
        doc: {
          entity: { behaviors: { rule_names: ['rule-c'], anomaly_job_ids: ['job-2', 'job-3'] } },
        },
      });

      const entityIds = ['host:host-123', 'host:server-01'] as const;
      const searchSources = async (index: string) => {
        const result = await esClient.search<Record<string, unknown>>({
          index,
          query: { terms: { 'entity.id': [...entityIds] } },
          size: entityIds.length,
        });
        return result.hits.hits
          .map(({ _source }) => _source)
          .filter((source): source is Record<string, unknown> => source != null);
      };
      const findByEntityId = (sources: Array<Record<string, unknown>>, entityId: string) =>
        sources.find((source) => (source.entity as Record<string, unknown>)?.id === entityId);

      const latestBefore = await searchSources(LATEST_ALIAS);
      expect(latestBefore).toHaveLength(entityIds.length);

      const snapshotStartedAt = Date.now();
      const snapshotResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.internal.FORCE_HISTORY_SNAPSHOT,
        {
          headers: internalHeaders,
          responseType: 'json',
          body: {},
        }
      );
      expect(snapshotResponse.statusCode).toBe(200);
      const body = snapshotResponse.body as {
        ok: boolean;
        historySnapshotIndex: string;
        docCount: number;
      };
      expect(body.ok).toBe(true);
      expect(body.historySnapshotIndex).toMatch(
        /\.entities\.v2\.history\.default\.\d{4}-\d{2}-\d{2}-\d{2}$/
      );
      expect(typeof body.docCount).toBe('number');

      const historyIndex = body.historySnapshotIndex;
      await esClient.indices.refresh({ index: historyIndex });
      const historyCount = await esClient.count({ index: historyIndex });
      expect(historyCount.count).toBe(body.docCount);

      const history = await searchSources(historyIndex);
      const latestAfter = await searchSources(LATEST_ALIAS);
      expect(history).toHaveLength(entityIds.length);

      const historyTimestamps = new Set(history.map((source) => source['@timestamp']));
      expect(historyTimestamps.size).toBe(1);
      const [snapshotTimestamp] = historyTimestamps;
      expect(Date.parse(snapshotTimestamp as string)).toBeGreaterThanOrEqual(
        snapshotStartedAt - 1000
      );

      for (const entityId of entityIds) {
        const before = findByEntityId(latestBefore, entityId);
        const historyDoc = findByEntityId(history, entityId);
        const after = findByEntityId(latestAfter, entityId);
        expect(historyDoc).toBeDefined();

        // History keeps the entity as it was in latest, apart from the snapshot time.
        expect({ ...historyDoc, '@timestamp': undefined }).toStrictEqual({
          ...before,
          '@timestamp': undefined,
        });
        // Latest is not modified by the snapshot.
        expect(after).toStrictEqual(before);
      }
    }
  );

  apiTest(
    'history snapshot: deletes indices older than retention using the date in the index name',
    async ({ apiClient, esClient }) => {
      const utcDaysAgo = (days: number, hours = 0): Date => {
        const now = new Date();
        return new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days, hours, 0, 0, 0)
        );
      };

      const expiredIndex = getHistorySnapshotIndexName('default', utcDaysAgo(61, 0));
      // 59 days ago is safely within the 60-day retention window regardless of when in the
      // UTC day the snapshot runs. Exact cutoff-day/hour behavior is covered by unit tests.
      const withinRetentionIndex = getHistorySnapshotIndexName('default', utcDaysAgo(59, 0));
      const recentIndex = getHistorySnapshotIndexName('default', utcDaysAgo(5, 12));
      const expiredLegacyIndex = getLegacySecurityHistorySnapshotIndexName(
        'default',
        utcDaysAgo(70, 0)
      );

      // Create only indices that don't already exist so we only clean up what we own.
      // Only swallow resource_already_exists_exception (status 400); any other error
      // (permission denied, template error, etc.) indicates a broken test environment
      // and should fail the test immediately rather than silently skipping creation and
      // producing a false-positive exists===false assertion.
      const testIndices: string[] = [];
      await Promise.all(
        [expiredIndex, withinRetentionIndex, recentIndex, expiredLegacyIndex].map(async (idx) => {
          try {
            await esClient.indices.create({ index: idx });
            testIndices.push(idx);
          } catch (err) {
            if (
              (err as { meta?: { body?: { error?: { type?: string } } } })?.meta?.body?.error
                ?.type !== 'resource_already_exists_exception'
            ) {
              throw err;
            }
          }
        })
      );

      try {
        const snapshotResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.internal.FORCE_HISTORY_SNAPSHOT,
          {
            headers: internalHeaders,
            responseType: 'json',
            body: {},
          }
        );
        expect(snapshotResponse.statusCode).toBe(200);
        const body = snapshotResponse.body as { ok: boolean; historySnapshotIndex: string };
        expect(body.ok).toBe(true);
        expect(body.historySnapshotIndex).toBeDefined();

        expect(await esClient.indices.exists({ index: expiredIndex })).toBe(false);
        expect(await esClient.indices.exists({ index: expiredLegacyIndex })).toBe(false);
        expect(await esClient.indices.exists({ index: withinRetentionIndex })).toBe(true);
        expect(await esClient.indices.exists({ index: recentIndex })).toBe(true);
        expect(await esClient.indices.exists({ index: body.historySnapshotIndex })).toBe(true);
      } finally {
        await Promise.all(
          testIndices.map((idx) =>
            esClient.indices.delete({ index: idx, ignore_unavailable: true }, { ignore: [404] })
          )
        );
      }
    }
  );
});
