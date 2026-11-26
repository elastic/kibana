/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  buildCleanupQuery,
  buildGroupCleanupQuery,
  CLEANUP_PAGE_SIZE,
  cleanupExpiredNotifications,
} from './cleanup_expired_notifications';
import { NOTIFICATION_DATA_STREAM_NAME } from '../storage/notification_data_stream';

describe('cleanupExpiredNotifications', () => {
  const abortController = new AbortController();

  const expiredGroup = (notificationId: string, newestExpiredAt: number) => ({
    key: { notification_id: notificationId },
    doc_count: 1,
    newest_expired_at: { value: newestExpiredAt },
  });

  const searchResponse = (expiredGroups: object) => ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 0, relation: 'eq' as const }, max_score: null, hits: [] },
    aggregations: { expired_groups: expiredGroups },
  });

  it('builds one expiration window per severity TTL', () => {
    const query = buildCleanupQuery() as {
      bool: { minimum_should_match: number; should: Array<{ bool: { filter: object[] } }> };
    };

    expect(query.bool.minimum_should_match).toBe(1);
    expect(query.bool.should).toEqual([
      {
        bool: {
          filter: [
            { terms: { severity: ['info'] } },
            { range: { '@timestamp': { lt: 'now-30d/d' } } },
          ],
        },
      },
      {
        bool: {
          filter: [
            { terms: { severity: ['warning'] } },
            { range: { '@timestamp': { lt: 'now-60d/d' } } },
          ],
        },
      },
      {
        bool: {
          filter: [
            { terms: { severity: ['error', 'critical'] } },
            { range: { '@timestamp': { lt: 'now-180d/d' } } },
          ],
        },
      },
    ]);
  });

  it('anchors each group deletion to its newest expired copy', () => {
    expect(
      buildGroupCleanupQuery([
        { notificationId: 'one', newestExpiredAt: 1_786_000_000_000 },
        { notificationId: 'two', newestExpiredAt: 1_787_000_000_000 },
      ])
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              filter: [
                { term: { notification_id: 'one' } },
                { range: { '@timestamp': { lte: 1_786_000_000_000 } } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { term: { notification_id: 'two' } },
                { range: { '@timestamp': { lte: 1_787_000_000_000 } } },
              ],
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('pages expired groups and deletes each page as one bounded query', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search
      .mockResolvedValueOnce(
        searchResponse({
          buckets: [expiredGroup('one', 1_786_000_000_000)],
          after_key: { notification_id: 'one' },
        })
      )
      .mockResolvedValueOnce(searchResponse({ buckets: [expiredGroup('two', 1_787_000_000_000)] }));
    esClient.deleteByQuery.mockResolvedValue({});

    await cleanupExpiredNotifications(esClient, abortController.signal);

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        index: NOTIFICATION_DATA_STREAM_NAME,
        size: 0,
        track_total_hits: false,
        query: buildCleanupQuery(),
        aggs: {
          expired_groups: {
            composite: {
              size: CLEANUP_PAGE_SIZE,
              sources: [{ notification_id: { terms: { field: 'notification_id' } } }],
            },
            aggs: { newest_expired_at: { max: { field: '@timestamp' } } },
          },
        },
      })
    );
    expect(esClient.search.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        aggs: {
          expired_groups: expect.objectContaining({
            composite: expect.objectContaining({ after: { notification_id: 'one' } }),
          }),
        },
      })
    );
    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(2);
    expect(esClient.deleteByQuery.mock.calls[0][0].query).toEqual(
      buildGroupCleanupQuery([{ notificationId: 'one', newestExpiredAt: 1_786_000_000_000 }])
    );
    expect(esClient.search.mock.calls[0][1]).toEqual({ signal: abortController.signal });
    expect(esClient.deleteByQuery.mock.calls[0][1]).toEqual({ signal: abortController.signal });
  });
});
