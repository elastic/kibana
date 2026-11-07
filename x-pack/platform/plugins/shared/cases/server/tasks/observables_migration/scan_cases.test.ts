/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsSerializer, SavedObjectsRawDoc } from '@kbn/core/server';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { countLegacyObservables, fetchLegacyCasesPage, StalePointInTimeError } from './scan_cases';

const serializer = {
  rawToSavedObject: jest.fn(({ _id, _source }: SavedObjectsRawDoc) => ({
    id: _id.replace('cases:', ''),
    type: 'cases',
    attributes: _source.cases,
    namespaces: _source.namespaces,
    references: [],
  })),
} as unknown as ISavedObjectsSerializer;

const hit = (id: string, createdAt: number) => ({
  _index: '.kibana_alerting_cases',
  _id: `cases:${id}`,
  _source: {
    type: 'cases',
    namespaces: ['default'],
    cases: {
      owner: 'securitySolution',
      observables: [{ id: `${id}-o1`, typeKey: 'observable-type-ipv4', value: '10.0.0.1' }],
    },
  },
  sort: [createdAt, 7],
});

const searchResponse = (hits: Array<ReturnType<typeof hit>>, pitId?: string) =>
  ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, failed: 0 },
    ...(pitId != null && { pit_id: pitId }),
    hits: { hits },
  } as unknown as Awaited<
    ReturnType<ReturnType<typeof savedObjectsRepositoryMock.create>['search']>
  >);

describe('fetchLegacyCasesPage', () => {
  it('reads cases holding observables through the point in time, oldest first', async () => {
    const repo = savedObjectsRepositoryMock.create();
    repo.search.mockResolvedValue(
      searchResponse([hit('case-1', 1000), hit('case-2', 2000)], 'pit-2')
    );

    const page = await fetchLegacyCasesPage({
      repo,
      serializer,
      cursor: { pitId: 'pit-1', searchAfter: [500, 3], lastCreatedAt: 500 },
      pageSize: 2,
    });

    expect(repo.search).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cases',
        namespaces: ['*'],
        pit: { id: 'pit-1', keep_alive: '10m' },
        size: 2,
        search_after: [500, 3],
        sort: [{ 'cases.created_at': { order: 'asc' } }, { _shard_doc: { order: 'asc' } }],
        query: {
          bool: {
            filter: [
              {
                nested: {
                  path: 'cases.observables',
                  query: { exists: { field: 'cases.observables.typeKey' } },
                },
              },
              { range: { 'cases.created_at': { gte: 500, format: 'epoch_millis' } } },
            ],
          },
        },
      })
    );
    expect(page.cases).toEqual([
      {
        id: 'case-1',
        owner: 'securitySolution',
        namespaces: ['default'],
        observables: [{ id: 'case-1-o1', typeKey: 'observable-type-ipv4', value: '10.0.0.1' }],
      },
      expect.objectContaining({ id: 'case-2' }),
    ]);
    expect(page.nextCursor).toEqual({
      pitId: 'pit-2',
      searchAfter: [2000, 7],
      lastCreatedAt: 2000,
    });
    expect(page.done).toBe(false);
  });

  it('starts a scan without a range and reports the end on a short page', async () => {
    const repo = savedObjectsRepositoryMock.create();
    repo.search.mockResolvedValue(searchResponse([], 'pit-1'));

    const page = await fetchLegacyCasesPage({
      repo,
      serializer,
      cursor: { pitId: 'pit-1' },
      pageSize: 2,
    });

    const [[options]] = repo.search.mock.calls;
    expect(options).not.toHaveProperty('search_after');
    expect(options.query?.bool?.filter).toHaveLength(1);
    expect(page).toEqual({ cases: [], nextCursor: { pitId: 'pit-1' }, done: true });
  });

  it('treats a response without a point in time as an expired point in time', async () => {
    const repo = savedObjectsRepositoryMock.create();
    repo.search.mockResolvedValue(searchResponse([]));

    await expect(
      fetchLegacyCasesPage({ repo, serializer, cursor: { pitId: 'pit-1' }, pageSize: 2 })
    ).rejects.toBeInstanceOf(StalePointInTimeError);
  });
});

describe('countLegacyObservables', () => {
  it('counts the cases and the observables in their field', async () => {
    const repo = savedObjectsRepositoryMock.create();
    repo.search.mockResolvedValue({
      ...searchResponse([]),
      hits: { total: { value: 2, relation: 'eq' }, hits: [] },
      aggregations: { observables: { doc_count: 5 } },
    });

    await expect(countLegacyObservables(repo)).resolves.toEqual({ cases: 2, observables: 5 });
    expect(repo.search).toHaveBeenCalledWith(
      expect.objectContaining({ size: 0, track_total_hits: true, namespaces: ['*'] })
    );
  });
});
