/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { queryProposalPills } from './proposal_pills_query';

const columns = [{ name: 'count' }, { name: 'total' }, { name: 'entityIds' }];

const setup = (values: unknown[][] = []) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.esql.query.mockResolvedValue({ columns, values } as never);
  const logger = loggingSystemMock.createLogger();
  const run = (overrides: Partial<Parameters<typeof queryProposalPills>[0]> = {}) =>
    queryProposalPills({
      esClient,
      logger,
      spaceId: 'space-1',
      origin: 'alertzero',
      categories: ['respond', 'investigate'],
      decidedWithinHours: 72,
      from: 0,
      size: 10,
      ...overrides,
    });
  return { esClient, run };
};

const sentQuery = (esClient: ReturnType<typeof setup>['esClient']) =>
  esClient.esql.query.mock.calls[0][0] as { query: string; params: unknown[] };

describe('queryProposalPills', () => {
  it('scopes to the open statuses of the categories and the settled ones within the window', async () => {
    const { esClient, run } = setup();

    await run();

    const { query, params } = sentQuery(esClient);
    expect(query).toContain(
      'status IN ("pending", "executing") AND category IN (?category0, ?category1)'
    );
    expect(query).toContain(
      'status IN ("succeeded", "failed", "expired", "no_action") AND decidedAt >= NOW() - 72 hours'
    );
    expect(query).toContain('supersededBy IS NULL');
    expect(params).toEqual([
      { space: 'space-1' },
      { origin: 'alertzero' },
      { category0: 'respond' },
      { category1: 'investigate' },
    ]);
  });

  it('leaves the settled window out when none is asked for', async () => {
    const { esClient, run } = setup();

    await run({ decidedWithinHours: undefined });

    expect(sentQuery(esClient).query).not.toContain('decidedAt');
  });

  it('limits to the end of the page and ranks with a stable tiebreak', async () => {
    const { esClient, run } = setup();

    await run({ from: 20, size: 10 });

    const { query } = sentQuery(esClient);
    expect(query).toContain('LIMIT 30');
    expect(query).toContain('SORT count DESC, entityIds ASC');
  });

  it('keeps the requested page of the rows and reads the total off the first row', async () => {
    const { run } = setup([
      [9, 5, 'user:root'],
      [8, 5, 'user:a'],
      [7, 5, 'user:b'],
      [6, 5, 'user:c'],
      [5, 5, 'user:d'],
    ]);

    expect(await run({ from: 3, size: 2 })).toEqual({
      rows: [
        { entityId: 'user:c', count: 6 },
        { entityId: 'user:d', count: 5 },
      ],
      total: 5,
    });
  });

  it('returns an empty page before either index exists', async () => {
    const { esClient, run } = setup();
    esClient.esql.query.mockRejectedValue(
      Object.assign(new Error('verification_exception: Unknown index [.kibana-proposals]'), {
        statusCode: 400,
      })
    );

    expect(await run()).toEqual({ rows: [], total: 0 });
  });

  it('lets any other failure surface', async () => {
    const { esClient, run } = setup();
    esClient.esql.query.mockRejectedValue(new Error('es down'));

    await expect(run()).rejects.toThrow('es down');
  });
});
