/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from '../../../common/types/domain';
import {
  buildObservablesSort,
  decodeObservablesCursor,
  encodeObservablesCursor,
  pageCaseFieldObservables,
  toObservable,
} from './find_observables';
import type { ObservableDocument } from './observables_index';

const buildObservable = (overrides: Partial<Observable>): Observable => ({
  id: 'id',
  typeKey: 'ipv4',
  value: '1.1.1.1',
  description: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
  ...overrides,
});

describe('buildObservablesSort', () => {
  it('orders by the requested field and ends with the type key and value, which are unique in a case', () => {
    expect(buildObservablesSort({ sortField: 'created', sortOrder: 'desc' })).toEqual([
      { created_at: 'desc' },
      { type_key: 'asc' },
      { value: 'asc' },
    ]);
    expect(buildObservablesSort({ sortField: 'updated', sortOrder: 'asc' })).toEqual([
      { updated_at: 'asc' },
      { type_key: 'asc' },
      { value: 'asc' },
    ]);
  });

  it('does not repeat a tie-breaker that is also the sort field', () => {
    expect(buildObservablesSort({ sortField: 'value', sortOrder: 'desc' })).toEqual([
      { value: 'desc' },
      { type_key: 'asc' },
    ]);
    expect(buildObservablesSort({ sortField: 'type', sortOrder: 'desc' })).toEqual([
      { type_key: 'desc' },
      { value: 'asc' },
    ]);
  });
});

describe('toObservable', () => {
  const document: ObservableDocument = {
    case_id: 'case-1',
    space_id: 'default',
    owner: 'securitySolution',
    type_key: 'ipv4',
    value: '1.1.1.1',
    description: 'first',
    legacy_id: 'legacy-1',
    source: 'api',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-02-01T00:00:00.000Z',
  };

  it('returns the id callers already know when it differs from the document id', () => {
    expect(toObservable({ id: 'document-id', document })).toEqual({
      id: 'legacy-1',
      typeKey: 'ipv4',
      value: '1.1.1.1',
      description: 'first',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    });
  });

  it('returns the document id when there is no legacy id', () => {
    const { legacy_id: legacyId, ...withoutLegacyId } = document;

    expect(toObservable({ id: 'document-id', document: withoutLegacyId }).id).toBe('document-id');
  });

  it('shows an observable that was never updated like the case field does: no description and no update time', () => {
    const { description, ...withoutDescription } = document;

    expect(
      toObservable({
        id: 'document-id',
        document: { ...withoutDescription, updated_at: document.created_at },
      })
    ).toMatchObject({ description: null, updatedAt: null });
  });
});

describe('pageCaseFieldObservables', () => {
  const observables = [
    buildObservable({
      id: 'a',
      value: 'b.example.com',
      typeKey: 'domain',
      createdAt: '2026-01-03',
    }),
    buildObservable({ id: 'b', value: '1.1.1.1', typeKey: 'ipv4', createdAt: '2026-01-01' }),
    buildObservable({
      id: 'c',
      value: 'a.example.com',
      typeKey: 'domain',
      createdAt: '2026-01-02',
      updatedAt: '2026-03-01',
    }),
    buildObservable({ id: 'd', value: '2.2.2.2', typeKey: 'ipv4', createdAt: '2026-01-02' }),
  ];

  const page = (overrides: Partial<Parameters<typeof pageCaseFieldObservables>[0]> = {}) =>
    pageCaseFieldObservables({
      observables,
      sortField: 'created',
      sortOrder: 'asc',
      perPage: 10,
      offset: 0,
      ...overrides,
    });
  const ids = (result: ReturnType<typeof page>) => result.observables.map(({ id }) => id);

  it('orders by creation time and breaks a tie by type key and value', () => {
    // c and d were created together: domain sorts before ipv4.
    expect(ids(page())).toEqual(['b', 'c', 'd', 'a']);
  });

  it('reverses only the sort field, not the tie-breakers', () => {
    expect(ids(page({ sortOrder: 'desc' }))).toEqual(['a', 'c', 'd', 'b']);
  });

  it('sorts by value, by type and by update time', () => {
    expect(ids(page({ sortField: 'value' }))).toEqual(['b', 'd', 'c', 'a']);
    expect(ids(page({ sortField: 'type' }))).toEqual(['c', 'a', 'b', 'd']);
    // Never-updated observables count as updated when they were created.
    expect(ids(page({ sortField: 'updated' }))).toEqual(['b', 'd', 'a', 'c']);
  });

  it('keeps only the observables of the requested types and counts them', () => {
    const result = page({ typeKeys: ['ipv4'] });

    expect(ids(result)).toEqual(['b', 'd']);
    expect(result.total).toBe(2);
  });

  it('does not filter when no type key is requested', () => {
    expect(page({ typeKeys: [] }).total).toBe(4);
  });

  it('cuts pages and tells where the next one starts, until the last page', () => {
    const first = page({ perPage: 3 });
    expect(ids(first)).toEqual(['b', 'c', 'd']);
    expect(first.total).toBe(4);
    expect(first.nextOffset).toBe(3);

    const last = page({ perPage: 3, offset: first.nextOffset });
    expect(ids(last)).toEqual(['a']);
    expect(last.nextOffset).toBeUndefined();
  });

  it('has no next page when the observables fill the page exactly', () => {
    expect(page({ perPage: 4 }).nextOffset).toBeUndefined();
  });

  it('does not change the observables it was given', () => {
    const before = observables.map(({ id }) => id);

    page({ sortOrder: 'desc' });

    expect(observables.map(({ id }) => id)).toEqual(before);
  });
});

describe('observables cursors', () => {
  const sort = { sortField: 'value', sortOrder: 'desc' } as const;

  it('reads back the cursor of an index page', () => {
    const cursor = encodeObservablesCursor({
      source: 'index',
      ...sort,
      searchAfter: ['1.1.1.1', 'ipv4'],
    });

    expect(decodeObservablesCursor({ cursor, source: 'index', ...sort })).toEqual({
      source: 'index',
      ...sort,
      searchAfter: ['1.1.1.1', 'ipv4'],
    });
  });

  it('reads back the cursor of a case field page', () => {
    const cursor = encodeObservablesCursor({ source: 'case', ...sort, offset: 25 });

    expect(decodeObservablesCursor({ cursor, source: 'case', ...sort })).toEqual({
      source: 'case',
      ...sort,
      offset: 25,
    });
  });

  it.each([
    ['not base64 json', 'not-a-cursor'],
    ['json that is not a cursor', Buffer.from('{"a":1}').toString('base64url')],
    [
      'a negative offset',
      Buffer.from(JSON.stringify({ source: 'case', ...sort, offset: -1 })).toString('base64url'),
    ],
  ])('rejects %s with a request to start again', (_, cursor) => {
    expect(() => decodeObservablesCursor({ cursor, source: 'case', ...sort })).toThrow(
      'Request the first page of observables again.'
    );
  });

  it('rejects a cursor made for the other store, as when reads moved to the index in between', () => {
    const cursor = encodeObservablesCursor({ source: 'case', ...sort, offset: 25 });

    expect(() => decodeObservablesCursor({ cursor, source: 'index', ...sort })).toThrow(
      'Request the first page of observables again.'
    );
  });

  it('rejects a cursor made for another order, since its sort values would not fit', () => {
    const cursor = encodeObservablesCursor({ source: 'case', ...sort, offset: 25 });

    expect(() =>
      decodeObservablesCursor({ cursor, source: 'case', sortField: 'created', sortOrder: 'desc' })
    ).toThrow('Request the first page of observables again.');
    expect(() =>
      decodeObservablesCursor({ cursor, source: 'case', sortField: 'value', sortOrder: 'asc' })
    ).toThrow('Request the first page of observables again.');
  });

  it.each([
    ['too few sort values', ['1.1.1.1']],
    ['too many sort values', ['1.1.1.1', 'ipv4', 'x', 'y']],
  ])(
    'rejects an index cursor with %s, which Elasticsearch would answer with an error',
    (_, searchAfter) => {
      const cursor = encodeObservablesCursor({ source: 'index', ...sort, searchAfter });

      expect(() => decodeObservablesCursor({ cursor, source: 'index', ...sort })).toThrow(
        'Request the first page of observables again.'
      );
    }
  );

  it('expects as many sort values as the sort has fields', () => {
    const created = { sortField: 'created', sortOrder: 'asc' } as const;
    const cursor = encodeObservablesCursor({
      source: 'index',
      ...created,
      searchAfter: [1767225600000, 'ipv4', '1.1.1.1'],
    });

    expect(decodeObservablesCursor({ cursor, source: 'index', ...created })).toMatchObject({
      searchAfter: [1767225600000, 'ipv4', '1.1.1.1'],
    });
  });

  it('answers a bad cursor with a 400', () => {
    expect.assertions(1);
    try {
      decodeObservablesCursor({ cursor: 'garbage', source: 'case', ...sort });
    } catch (error) {
      expect(error.output.statusCode).toBe(400);
    }
  });
});
