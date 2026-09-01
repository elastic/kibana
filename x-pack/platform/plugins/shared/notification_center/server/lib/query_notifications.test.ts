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

  it('composes namespace, type, and time-range filters', async () => {
    const { deps, search } = setup();

    await queryNotifications(deps, {
      namespace: 'inference',
      type: 'modelStatus',
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-20T00:00:00.000Z',
    });

    const [{ query }] = search.mock.calls[0];
    expect(query.bool.filter).toEqual(
      expect.arrayContaining([
        { term: { namespace: 'inference' } },
        { term: { type: 'modelStatus' } },
        {
          range: {
            '@timestamp': { gte: '2026-07-01T00:00:00.000Z', lte: '2026-07-20T00:00:00.000Z' },
          },
        },
      ])
    );
  });

  it('omits attribute filters that are not provided', async () => {
    const { deps, search } = setup();

    await queryNotifications(deps);

    const [{ query }] = search.mock.calls[0];
    expect(query.bool.filter).toEqual([]);
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
    const readOverride = (markedAt: string) => ({ read: true, markedAt });

    it('marks an id read from its own override', async () => {
      const { deps } = setup([
        doc('a', '2026-07-15T00:00:00.000Z'),
        doc('b', '2026-07-14T00:00:00.000Z'),
      ]);

      const result = await queryNotifications(
        deps,
        {},
        {
          overrides: { a: readOverride('2026-07-16T00:00:00.000Z') },
          readAllBefore: READ_ALL_BEFORE_DEFAULT,
        }
      );

      expect(result.items.map(({ notification_id: id, isRead }) => [id, isRead])).toEqual([
        ['a', true],
        ['b', false],
      ]);
    });

    it('resurfaces a re-push after readAllBefore as unread', async () => {
      // The annotation anchors on the representative (the newest copy), so a copy pushed
      // after a mark-all-read is new activity and comes back unread.
      const { deps } = setup([
        doc('re-pushed', '2026-07-20T00:00:00.000Z'),
        doc('quiet', '2026-07-10T00:00:00.000Z'),
      ]);

      const result = await queryNotifications(
        deps,
        {},
        { overrides: {}, readAllBefore: '2026-07-15T00:00:00.000Z' }
      );

      expect(result.items.map(({ notification_id: id, isRead }) => [id, isRead])).toEqual([
        ['re-pushed', false],
        ['quiet', true],
      ]);
    });

    it('resurfaces a re-push after an individual mark-read as unread', async () => {
      // A read override is a timestamped acknowledgement of the copy in hand, not a mute:
      // a newer copy escapes it the same way it escapes the bulk marker.
      const { deps } = setup([doc('acknowledged', '2026-07-20T00:00:00.000Z')]);

      const result = await queryNotifications(
        deps,
        {},
        {
          overrides: { acknowledged: readOverride('2026-07-18T00:00:00.000Z') },
          readAllBefore: '2026-07-19T00:00:00.000Z',
        }
      );

      // The override wins over the later marker, so the marker cannot mask the re-push
      expect(result.items[0].isRead).toBe(false);
    });

    it('orders by recency regardless of read state', async () => {
      // The server reports `isRead` but never orders by it, so the sequence is identical
      // for every caller and a client tracking read state locally has nothing to reconcile.
      const { deps } = setup([
        doc('read-new', '2026-07-20T00:00:00.000Z'),
        doc('unread-new', '2026-07-15T00:00:00.000Z'),
        doc('read-old', '2026-07-10T00:00:00.000Z'),
        doc('unread-old', '2026-07-05T00:00:00.000Z'),
      ]);

      const result = await queryNotifications(
        deps,
        {},
        {
          overrides: {
            'read-new': readOverride('2026-07-21T00:00:00.000Z'),
            'read-old': readOverride('2026-07-11T00:00:00.000Z'),
          },
          readAllBefore: READ_ALL_BEFORE_DEFAULT,
        }
      );

      expect(result.items.map(({ notification_id: id }) => id)).toEqual([
        'read-new',
        'unread-new',
        'read-old',
        'unread-old',
      ]);
    });

    it('accepts read state as a promise resolved alongside the search', async () => {
      const { deps } = setup([doc('a', '2026-07-15T00:00:00.000Z')]);

      const result = await queryNotifications(
        deps,
        {},
        Promise.resolve({
          overrides: { a: readOverride('2026-07-16T00:00:00.000Z') },
          readAllBefore: READ_ALL_BEFORE_DEFAULT,
        })
      );

      expect(result.items[0].isRead).toBe(true);
    });

    it('returns an unannotated list when the read-state promise resolves to undefined', async () => {
      const { deps } = setup([doc('a', '2026-07-15T00:00:00.000Z')]);

      const result = await queryNotifications(deps, {}, Promise.resolve(undefined));

      expect(result.items[0]).not.toHaveProperty('isRead');
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
