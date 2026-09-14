/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { deleteIndex } from '../../infra/elasticsearch';
import { hasCollidingNeutralNamespaceAssets } from '../asset_manager/migrate_legacy_security_assets';
import {
  deleteExpiredHistorySnapshots,
  getHistorySnapshotRetentionCutoffDate,
  selectExpiredHistorySnapshotIndices,
} from './expire_history_snapshots';

jest.mock('../../infra/elasticsearch', () => ({
  deleteIndex: jest.fn(),
}));

jest.mock('../asset_manager/migrate_legacy_security_assets', () => ({
  hasCollidingNeutralNamespaceAssets: jest.fn(),
}));

const mockDeleteIndex = deleteIndex as jest.MockedFunction<typeof deleteIndex>;
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
    it('deletes indices older than the cutoff and keeps the cutoff day regardless of hour', () => {
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
      mockDeleteIndex.mockResolvedValue({} as never);
      esClient = {
        indices: {
          resolveIndex: jest.fn(),
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
        now,
        maxDeletes: 2,
      });

      expect(result.deleted).toEqual([
        '.entities.v2.history.security_default.2026-07-01-00',
        '.entities.v2.history.default.2026-08-13-00',
      ]);
      expect(mockDeleteIndex).toHaveBeenCalledTimes(2);
      expect(mockDeleteIndex).not.toHaveBeenCalledWith(
        esClient,
        '.entities.v2.history.default.2026-08-15-00',
        expect.anything()
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
        now,
      });

      expect(esClient.indices.resolveIndex).toHaveBeenCalledTimes(1);
      expect(esClient.indices.resolveIndex).toHaveBeenCalledWith(
        { name: '.entities.v2.history.default.*' },
        expect.anything()
      );
    });

    it('does not throw when an individual delete fails', async () => {
      (esClient.indices.resolveIndex as jest.Mock).mockResolvedValue({
        indices: [{ name: '.entities.v2.history.default.2026-07-01-00' }],
        aliases: [],
        data_streams: [],
      });
      mockDeleteIndex.mockRejectedValue(new Error('delete failed'));

      await expect(
        deleteExpiredHistorySnapshots({
          esClient,
          namespace,
          retentionDays: 30,
          logger,
          now,
        })
      ).resolves.toEqual({ deleted: [] });
      expect(logger.error).toHaveBeenCalled();
    });

    it('does not throw when listing indices fails', async () => {
      mockHasColliding.mockRejectedValue(new Error('cluster unavailable'));

      await expect(
        deleteExpiredHistorySnapshots({
          esClient,
          namespace,
          retentionDays: 30,
          logger,
          now,
        })
      ).resolves.toEqual({ deleted: [] });
      expect(mockDeleteIndex).not.toHaveBeenCalled();
    });

    it('returns without deleting when the abort signal is already aborted', async () => {
      const abortSignal = AbortSignal.abort();

      const result = await deleteExpiredHistorySnapshots({
        esClient,
        namespace,
        retentionDays: 30,
        logger,
        now,
        abortSignal,
      });

      expect(result.deleted).toEqual([]);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
    });
  });
});
