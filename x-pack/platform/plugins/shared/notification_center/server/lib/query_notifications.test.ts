/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataStreamServiceMock } from '@kbn/core-data-streams-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { READ_ALL_BEFORE_DEFAULT } from '../storage/user_storage';
import { queryNotifications, NOTIFICATION_QUERY_RESULT_LIMIT } from './query_notifications';
import { severityTTLBoundary } from './severity_ttl_query';

const doc = (id: string, ts: string, overrides: Record<string, unknown> = {}) => ({
  '@timestamp': ts,
  notification_id: id,
  namespace: 'inference',
  type: 'modelStatus',
  title: 'Model deprecated',
  description: 'Your endpoint model is deprecated.',
  severity: 'info',
  ...overrides,
});

/** Mock hit carrying the collapse `inner_hits` for the group's earliest in-horizon copy. */
const hitWithEarliest = (source: Record<string, unknown>, earliest: string, i: number) => ({
  _id: `doc-${i}`,
  _source: source,
  inner_hits: {
    earliest: { hits: { hits: [{ _source: { '@timestamp': earliest } }] } },
  },
});

const setup = (docs: Array<Record<string, unknown>> = []) => {
  const search = jest.fn().mockResolvedValue({
    hits: { hits: docs.map((source, i) => ({ _id: `doc-${i}`, _source: source })) },
  });
  const dataStreams = dataStreamServiceMock.createStartContract();
  dataStreams.initializeClient.mockResolvedValue({ search } as never);

  const deps = { dataStreams, logger: loggingSystemMock.createLogger() };
  return { deps, search };
};

describe('queryNotifications', () => {
  it('collapses on notification_id sorted by latest, capped at the group limit', async () => {
    const { deps, search } = setup();

    await queryNotifications(deps);

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        collapse: { field: 'notification_id' },
        sort: [{ '@timestamp': 'desc' }, { notification_id: 'asc' }],
        // One over the limit so a full page is distinguishable from a truncated one.
        size: NOTIFICATION_QUERY_RESULT_LIMIT + 1,
      })
    );
  });

  it('applies one severity-TTL horizon window per tier plus a forward-compat window', async () => {
    const { deps, search } = setup();

    await queryNotifications(deps);

    const [{ query }] = search.mock.calls[0];
    expect(query.bool.filter[0]).toEqual({
      bool: {
        should: [
          {
            bool: {
              filter: [
                { terms: { severity: ['info'] } },
                { range: { '@timestamp': { gte: severityTTLBoundary(30) } } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { terms: { severity: ['warning'] } },
                { range: { '@timestamp': { gte: severityTTLBoundary(60) } } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { terms: { severity: ['error', 'critical'] } },
                { range: { '@timestamp': { gte: severityTTLBoundary(180) } } },
              ],
            },
          },
          // Unknown/future severity tiers stay visible for the longest window instead of dropping.
          {
            bool: {
              must_not: { terms: { severity: ['info', 'warning', 'error', 'critical'] } },
              filter: [{ range: { '@timestamp': { gte: severityTTLBoundary(180) } } }],
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('composes namespace, type, and severity filters', async () => {
    const { deps, search } = setup();

    await queryNotifications(deps, {
      namespace: 'inference',
      type: 'modelStatus',
      severity: ['warning', 'error'],
    });

    const [{ query }] = search.mock.calls[0];
    expect(query.bool.filter).toEqual(
      expect.arrayContaining([
        { term: { namespace: 'inference' } },
        { term: { type: 'modelStatus' } },
        { terms: { severity: ['warning', 'error'] } },
      ])
    );
  });

  it('applies the from/to window in-memory instead of as a doc-level filter', async () => {
    const { deps, search } = setup([
      doc('late', '2026-07-20T00:00:00.000Z'),
      doc('in', '2026-07-10T00:00:00.000Z'),
      doc('early', '2026-07-01T00:00:00.000Z'),
    ]);

    const result = await queryNotifications(deps, {
      from: '2026-07-05T00:00:00.000Z',
      to: '2026-07-15T00:00:00.000Z',
    });

    expect(result.items.map(({ notification_id: id }) => id)).toEqual(['in']);
    // Only the severity-TTL horizon: a doc-level range would change which copy is
    // the group's earliest visible one and destabilize the read-state anchor.
    const [{ query }] = search.mock.calls[0];
    expect(query.bool.filter).toHaveLength(1);
  });

  it('omits attribute filters that are not provided', async () => {
    const { deps, search } = setup();

    await queryNotifications(deps);

    const [{ query }] = search.mock.calls[0];
    expect(query.bool.filter).toHaveLength(1);
  });

  it('returns the full collapsed set for the client to paginate', async () => {
    const { deps } = setup(
      ['a', 'b', 'c', 'd', 'e'].map((id, i) => doc(id, `2026-07-1${i}T00:00:00.000Z`))
    );

    const result = await queryNotifications(deps);

    expect(result.items.map(({ notification_id: id }) => id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(result.truncated).toBe(false);
  });

  it('does not flag truncated when exactly the group limit is returned', async () => {
    const { deps } = setup(
      Array.from({ length: NOTIFICATION_QUERY_RESULT_LIMIT }, (_, i) =>
        doc(`id-${i}`, '2026-07-15T00:00:00.000Z')
      )
    );

    const result = await queryNotifications(deps);

    expect(result.items).toHaveLength(NOTIFICATION_QUERY_RESULT_LIMIT);
    expect(result.truncated).toBe(false);
  });

  it('flags truncated and caps items when the fetch overflows the group limit', async () => {
    const { deps } = setup(
      Array.from({ length: NOTIFICATION_QUERY_RESULT_LIMIT + 1 }, (_, i) =>
        doc(`id-${i}`, '2026-07-15T00:00:00.000Z')
      )
    );

    const result = await queryNotifications(deps);

    expect(result.items).toHaveLength(NOTIFICATION_QUERY_RESULT_LIMIT);
    expect(result.truncated).toBe(true);
  });

  it('rejects params that fail schema validation before querying', async () => {
    const { deps, search } = setup();

    await expect(queryNotifications(deps, { from: 'not-a-date' })).rejects.toThrow();
    expect(search).not.toHaveBeenCalled();
  });

  it('drops malformed docs instead of failing the response', async () => {
    const { deps } = setup([doc('good', '2026-07-15T00:00:00.000Z'), { notification_id: 'bad' }]);

    const result = await queryNotifications(deps);

    expect(result.items.map(({ notification_id: id }) => id)).toEqual(['good']);
    expect(deps.logger.debug).toHaveBeenCalledTimes(1);
  });

  it('normalizes an unknown severity tier to info on read', async () => {
    const { deps } = setup([
      doc('future', '2026-07-15T00:00:00.000Z', { severity: 'catastrophic' }),
    ]);

    const result = await queryNotifications(deps);

    expect(result.items[0].severity).toBe('info');
  });

  describe('read-state annotation', () => {
    it('marks an individually-read id as read', async () => {
      const { deps } = setup([
        doc('a', '2026-07-15T00:00:00.000Z'),
        doc('b', '2026-07-14T00:00:00.000Z'),
      ]);

      const result = await queryNotifications(
        deps,
        {},
        { read: ['a'], readAllBefore: READ_ALL_BEFORE_DEFAULT }
      );

      expect(result.items.map(({ notification_id: id, isRead }) => [id, isRead])).toEqual([
        ['b', false],
        ['a', true],
      ]);
    });

    it('anchors readAllBefore on the earliest in-horizon copy, not the latest re-push', async () => {
      // Re-pushed after mark-all-read: latest copy is newer than readAllBefore,
      // but the earliest visible copy predates it, so it must stay read.
      const search = jest.fn().mockResolvedValue({
        hits: {
          hits: [
            hitWithEarliest(doc('a', '2026-07-20T00:00:00.000Z'), '2026-07-10T00:00:00.000Z', 0),
            hitWithEarliest(doc('b', '2026-07-20T00:00:00.000Z'), '2026-07-16T00:00:00.000Z', 1),
          ],
        },
      });
      const dataStreams = dataStreamServiceMock.createStartContract();
      dataStreams.initializeClient.mockResolvedValue({ search } as never);
      const deps = { dataStreams, logger: loggingSystemMock.createLogger() };

      const result = await queryNotifications(
        deps,
        {},
        { read: [], readAllBefore: '2026-07-15T00:00:00.000Z' }
      );

      expect(result.items.map(({ notification_id: id, isRead }) => [id, isRead])).toEqual([
        ['b', false],
        ['a', true],
      ]);
    });

    it('requests the earliest in-horizon copy per group only when annotating', async () => {
      const { deps, search } = setup();

      await queryNotifications(deps, {}, { read: [], readAllBefore: READ_ALL_BEFORE_DEFAULT });

      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({
          collapse: {
            field: 'notification_id',
            inner_hits: {
              name: 'earliest',
              size: 1,
              sort: [{ '@timestamp': 'asc' }],
              _source: ['@timestamp'],
            },
          },
        })
      );
    });

    it('sorts unread before read, newest first within each', async () => {
      const { deps } = setup([
        doc('read-new', '2026-07-20T00:00:00.000Z'),
        doc('unread-new', '2026-07-15T00:00:00.000Z'),
        doc('read-old', '2026-07-10T00:00:00.000Z'),
        doc('unread-old', '2026-07-05T00:00:00.000Z'),
      ]);

      const result = await queryNotifications(
        deps,
        {},
        { read: ['read-new', 'read-old'], readAllBefore: READ_ALL_BEFORE_DEFAULT }
      );

      expect(result.items.map(({ notification_id: id }) => id)).toEqual([
        'unread-new',
        'unread-old',
        'read-new',
        'read-old',
      ]);
    });

    it('does not fetch inner hits for profile-less callers', async () => {
      const { deps, search } = setup();

      await queryNotifications(deps);

      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({ collapse: { field: 'notification_id' } })
      );
    });

    // Locked decision on search-team#14979: listing stays open to API-key/headless
    // callers, which have no profile — they get the list without read state, not a 403.
    it('omits isRead entirely when no read state is provided', async () => {
      const { deps } = setup([doc('a', '2026-07-15T00:00:00.000Z')]);

      const result = await queryNotifications(deps);

      expect(result.items[0]).not.toHaveProperty('isRead');
    });
  });
});
