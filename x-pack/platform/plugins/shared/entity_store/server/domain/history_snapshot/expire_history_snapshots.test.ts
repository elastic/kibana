/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { hasCollidingNeutralNamespaceAssets } from '../asset_manager/migrate_legacy_security_assets';
import {
  deleteExpiredHistorySnapshots,
  getHistorySnapshotRetentionCutoffDate,
  selectExpiredHistorySnapshotIndices,
} from './expire_history_snapshots';

jest.mock('../asset_manager/migrate_legacy_security_assets', () => ({
  hasCollidingNeutralNamespaceAssets: jest.fn(),
}));

const mockHasColliding = hasCollidingNeutralNamespaceAssets as jest.MockedFunction<
  typeof hasCollidingNeutralNamespaceAssets
>;

describe('history snapshot retention', () => {
  const now = new Date('2026-09-14T15:30:00.000Z');

  describe('getHistorySnapshotRetentionCutoffDate', () => {
    it('returns the UTC calendar date retentionDays before now', () => {
      expect(getHistorySnapshotRetentionCutoffDate(now, 30)).toBe('2026-08-15');
    });
  });

  describe('selectExpiredHistorySnapshotIndices', () => {
    it('selects indices older than the cutoff and keeps the cutoff day regardless of hour', () => {
      const expired = selectExpiredHistorySnapshotIndices(
        [
          '.entities.v2.history.default.2026-08-14-23',
          '.entities.v2.history.default.2026-08-15-00',
          '.entities.v2.history.default.2026-08-15-23',
          '.entities.v2.history.default.2026-09-01-12',
          '.entities.v2.history.default.not-a-date',
        ],
        30,
        now
      );

      expect(expired).toEqual(['.entities.v2.history.default.2026-08-14-23']);
    });

    it('returns expired indices oldest first and includes legacy names', () => {
      const expired = selectExpiredHistorySnapshotIndices(
        [
          '.entities.v2.history.default.2026-08-10-01',
          '.entities.v2.history.security_default.2026-07-01-00',
          '.entities.v2.history.default.2026-08-01-12',
        ],
        30,
        now
      );

      expect(expired).toEqual([
        '.entities.v2.history.security_default.2026-07-01-00',
        '.entities.v2.history.default.2026-08-01-12',
        '.entities.v2.history.default.2026-08-10-01',
      ]);
    });
  });

  describe('deleteExpiredHistorySnapshots', () => {
    const namespace = 'default';
    const logger = loggerMock.create();
    let esClient: jest.Mocked<ElasticsearchClient>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockHasColliding.mockResolvedValue(false);
      esClient = {
        indices: {
          resolveIndex: jest.fn(),
          delete: jest.fn().mockResolvedValue({}),
        },
      } as unknown as jest.Mocked<ElasticsearchClient>;
    });

    it('deletes expired indices from current and legacy patterns, oldest first, up to the cap', async () => {
      (esClient.indices.resolveIndex as jest.Mock).mockImplementation(
        async ({ name }: { name: string }) => {
          if (name === '.entities.v2.history.default.*') {
            return {
              indices: [
                { name: '.entities.v2.history.default.2026-08-15-00' },
                { name: '.entities.v2.history.default.2026-08-14-00' },
                { name: '.entities.v2.history.default.2026-08-13-00' },
              ],
              aliases: [],
              data_streams: [],
            };
          }
          return {
            indices: [{ name: '.entities.v2.history.security_default.2026-07-01-00' }],
            aliases: [],
            data_streams: [],
          };
        }
      );

      const result = await deleteExpiredHistorySnapshots({
        esClient,
        namespace,
        retentionDays: 30,
        logger,
        maxDeletes: 2,
      });

      expect(result.deleted).toEqual([
        '.entities.v2.history.security_default.2026-07-01-00',
        '.entities.v2.history.default.2026-08-13-00',
      ]);
      expect(esClient.indices.delete).toHaveBeenCalledTimes(1);
      expect(esClient.indices.delete).toHaveBeenCalledWith(
        {
          index: [
            '.entities.v2.history.security_default.2026-07-01-00',
            '.entities.v2.history.default.2026-08-13-00',
          ],
        },
        { signal: undefined, ignore: [404] }
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'Cleared history snapshot indices: .entities.v2.history.security_default.2026-07-01-00, .entities.v2.history.default.2026-08-13-00'
      );
    });

    it('deletes every resolved index when retentionDays is omitted, ignoring maxDeletes', async () => {
      (esClient.indices.resolveIndex as jest.Mock).mockImplementation(
        async ({ name }: { name: string }) => {
          if (name === '.entities.v2.history.default.*') {
            return {
              indices: [
                { name: '.entities.v2.history.default.2026-09-01-00' },
                { name: '.entities.v2.history.default.not-a-date' },
              ],
              aliases: [],
              data_streams: [],
            };
          }
          return {
            indices: [{ name: '.entities.v2.history.security_default.2026-07-01-00' }],
            aliases: [],
            data_streams: [],
          };
        }
      );

      const result = await deleteExpiredHistorySnapshots({
        esClient,
        namespace,
        logger,
        maxDeletes: 1,
      });

      expect(result.deleted).toEqual([
        '.entities.v2.history.default.2026-09-01-00',
        '.entities.v2.history.default.not-a-date',
        '.entities.v2.history.security_default.2026-07-01-00',
      ]);
      expect(esClient.indices.delete).toHaveBeenCalledTimes(1);
      expect(esClient.indices.delete).toHaveBeenCalledWith(
        {
          index: [
            '.entities.v2.history.default.2026-09-01-00',
            '.entities.v2.history.default.not-a-date',
            '.entities.v2.history.security_default.2026-07-01-00',
          ],
        },
        { signal: undefined, ignore: [404] }
      );
    });

    it('skips the legacy pattern when a colliding security_{namespace} store exists', async () => {
      mockHasColliding.mockResolvedValue(true);
      (esClient.indices.resolveIndex as jest.Mock).mockResolvedValue({
        indices: [],
        aliases: [],
        data_streams: [],
      });

      await deleteExpiredHistorySnapshots({
        esClient,
        namespace,
        retentionDays: 30,
        logger,
      });

      expect(esClient.indices.resolveIndex).toHaveBeenCalledTimes(1);
      expect(esClient.indices.resolveIndex).toHaveBeenCalledWith(
        {
          name: '.entities.v2.history.default.*',
          ignore_unavailable: true,
          allow_no_indices: true,
        },
        { signal: undefined }
      );
    });

    it('rejects when an index delete fails', async () => {
      (esClient.indices.resolveIndex as jest.Mock).mockResolvedValue({
        indices: [{ name: '.entities.v2.history.default.2026-07-01-00' }],
        aliases: [],
        data_streams: [],
      });
      (esClient.indices.delete as jest.Mock).mockRejectedValue(new Error('delete failed'));

      await expect(
        deleteExpiredHistorySnapshots({
          esClient,
          namespace,
          retentionDays: 30,
          logger,
        })
      ).rejects.toThrow('delete failed');
    });

    it('rejects when listing indices fails', async () => {
      (esClient.indices.resolveIndex as jest.Mock).mockRejectedValue(new Error('Forbidden'));

      await expect(
        deleteExpiredHistorySnapshots({
          esClient,
          namespace,
          retentionDays: 30,
          logger,
        })
      ).rejects.toThrow('Forbidden');
      expect(esClient.indices.delete).not.toHaveBeenCalled();
    });

    it('returns without deleting when the abort signal is already aborted', async () => {
      const abortSignal = AbortSignal.abort();

      const result = await deleteExpiredHistorySnapshots({
        esClient,
        namespace,
        retentionDays: 30,
        logger,
        abortSignal,
      });

      expect(result.deleted).toEqual([]);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
    });

    it('forwards an unaborted signal to collision check, resolveIndex, and delete', async () => {
      const controller = new AbortController();
      const { signal } = controller;

      (esClient.indices.resolveIndex as jest.Mock).mockResolvedValue({
        indices: [{ name: '.entities.v2.history.default.2026-07-01-00' }],
        aliases: [],
        data_streams: [],
      });

      await deleteExpiredHistorySnapshots({
        esClient,
        namespace,
        retentionDays: 30,
        logger,
        abortSignal: signal,
      });

      expect(mockHasColliding).toHaveBeenCalledWith(esClient, namespace, signal, true);
      expect(esClient.indices.resolveIndex).toHaveBeenCalledWith(expect.anything(), { signal });
      expect(esClient.indices.delete).toHaveBeenCalledWith(expect.anything(), {
        signal,
        ignore: [404],
      });
    });

    it('splits deletion into multiple requests when indices exceed the URL length limit', async () => {
      // Each name is ~1202 bytes. Two fit in one chunk (1202 + 3 + 1202 = 2407 < 3500),
      // the third would push it to 2407 + 3 + 1202 = 3612 > 3500, so it starts a new chunk.
      const index1 = `${'a'.repeat(1200)}-1`;
      const index2 = `${'a'.repeat(1200)}-2`;
      const index3 = `${'a'.repeat(1200)}-3`;
      (esClient.indices.resolveIndex as jest.Mock).mockImplementation(
        async ({ name }: { name: string }) => {
          if (name === '.entities.v2.history.default.*') {
            return {
              indices: [{ name: index1 }, { name: index2 }, { name: index3 }],
              aliases: [],
              data_streams: [],
            };
          }
          return { indices: [], aliases: [], data_streams: [] };
        }
      );

      const result = await deleteExpiredHistorySnapshots({
        esClient,
        namespace,
        logger,
      });

      expect(result.deleted).toEqual([index1, index2, index3]);
      expect(esClient.indices.delete).toHaveBeenCalledTimes(2);
      expect(esClient.indices.delete).toHaveBeenNthCalledWith(
        1,
        { index: [index1, index2] },
        { signal: undefined, ignore: [404] }
      );
      expect(esClient.indices.delete).toHaveBeenNthCalledWith(
        2,
        { index: [index3] },
        { signal: undefined, ignore: [404] }
      );
    });
  });
});
