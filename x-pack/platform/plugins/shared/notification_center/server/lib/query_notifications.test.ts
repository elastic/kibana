/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataStreamServiceMock } from '@kbn/core-data-streams-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
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

  it('composes namespace, type, severity, and time-range filters', async () => {
    const { deps, search } = setup();

    await queryNotifications(deps, {
      namespace: 'inference',
      type: 'modelStatus',
      severity: ['warning', 'error'],
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-20T00:00:00.000Z',
    });

    const [{ query }] = search.mock.calls[0];
    expect(query.bool.filter).toEqual(
      expect.arrayContaining([
        { term: { namespace: 'inference' } },
        { term: { type: 'modelStatus' } },
        { terms: { severity: ['warning', 'error'] } },
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
});
