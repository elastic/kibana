/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from '../../../common/types/domain';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import type { ObservableSortValues } from '../../services/observables';
import {
  compareSortValues,
  decodeCursor,
  encodeCursor,
  findObservables,
  getSortValues,
} from './find_observables';

const observable = (
  id: string,
  value: string,
  createdAt: string,
  typeKey = 'observable-type-ipv4'
): Observable => ({
  id,
  typeKey,
  value,
  description: null,
  createdAt,
  updatedAt: null,
});

const fieldObservables = [
  observable('f1', '10.0.0.1', '2026-11-01T00:00:00.000Z'),
  observable('f2', '10.0.0.3', '2026-11-03T00:00:00.000Z'),
  observable('f3', 'host-a', '2026-11-05T00:00:00.000Z', 'observable-type-hostname'),
];

const typeObservables = [
  observable('t1', '10.0.0.2', '2026-11-02T00:00:00.000Z'),
  observable('t2', '10.0.0.4', '2026-11-04T00:00:00.000Z'),
];

describe('findObservables', () => {
  const clientArgs = createCasesClientMockArgs();
  const { caseService, observableService } = clientArgs.services;

  const pageOf = (observables: Observable[], total = observables.length) => ({
    items: observables.map((item) => ({
      observable: item,
      sort: getSortValues(item, 'createdAt'),
    })),
    total,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    caseService.getCase.mockResolvedValue({
      ...mockCases[0],
      attributes: { ...mockCases[0].attributes, observables: fieldObservables },
    });
    clientArgs.authorization.ensureAuthorized.mockResolvedValue(undefined);
  });

  it('merges the case field and a page of the type in one order, with a cursor', async () => {
    observableService.findPage.mockResolvedValue(pageOf(typeObservables, 10));

    const result = await findObservables(mockCases[0].id, { perPage: 3 }, clientArgs);

    expect(result.observables.map(({ id }) => id)).toEqual(['f1', 't1', 'f2']);
    expect(result.total).toBe(13);
    expect(result.cursor).toBeDefined();
    expect(decodeCursor(result.cursor as string, 'createdAt')).toEqual(
      getSortValues(fieldObservables[1], 'createdAt')
    );
    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: expect.objectContaining({ name: 'getCase', action: 'case_observables_find' }),
      entities: [{ id: mockCases[0].id, owner: mockCases[0].attributes.owner }],
    });
  });

  it('continues after the cursor in both stores', async () => {
    observableService.findPage.mockResolvedValue(pageOf([typeObservables[1]], 10));
    const cursor = encodeCursor(getSortValues(fieldObservables[1], 'createdAt'));

    const result = await findObservables(mockCases[0].id, { perPage: 3, cursor }, clientArgs);

    expect(observableService.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ searchAfter: getSortValues(fieldObservables[1], 'createdAt') })
    );
    expect(result.observables.map(({ id }) => id)).toEqual(['t2', 'f3']);
    expect(result.cursor).toBeUndefined();
  });

  it('filters the field like the type: by type key and by the start of the value, ignoring case', async () => {
    observableService.findPage.mockResolvedValue(pageOf([]));

    const result = await findObservables(
      mockCases[0].id,
      { search: 'HOST', typeKeys: ['observable-type-hostname'] },
      clientArgs
    );

    expect(result.observables.map(({ id }) => id)).toEqual(['f3']);
    expect(observableService.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'HOST', typeKeys: ['observable-type-hostname'] })
    );
  });

  it('does not match the middle of a value', async () => {
    observableService.findPage.mockResolvedValue(pageOf([]));

    const result = await findObservables(mockCases[0].id, { search: '0.0.1' }, clientArgs);

    expect(result.observables).toEqual([]);
  });

  it('sorts by value descending', async () => {
    observableService.findPage.mockResolvedValue({
      items: typeObservables.map((item) => ({
        observable: item,
        sort: getSortValues(item, 'value'),
      })),
      total: 2,
    });

    const result = await findObservables(
      mockCases[0].id,
      { sortField: 'value', sortOrder: 'desc', perPage: 10 },
      clientArgs
    );

    expect(result.observables.map(({ value }) => value)).toEqual([
      'host-a',
      '10.0.0.4',
      '10.0.0.3',
      '10.0.0.2',
      '10.0.0.1',
    ]);
  });

  it('rejects a cursor that does not match the sort', async () => {
    await expect(
      findObservables(
        mockCases[0].id,
        { sortField: 'value', cursor: encodeCursor([1, 'a', 'b']) },
        clientArgs
      )
    ).rejects.toThrow('Invalid observables cursor');
  });
});

describe('compareSortValues', () => {
  it('orders the first value as requested and the tie-breakers ascending', () => {
    const a: ObservableSortValues = [1, 'a', 'x'];
    const b: ObservableSortValues = [1, 'b', 'x'];

    expect(compareSortValues(a, b, 'desc')).toBeLessThan(0);
    expect(compareSortValues([2, 'a', 'x'], [1, 'a', 'x'], 'desc')).toBeLessThan(0);
  });

  it('orders keywords by their UTF-8 bytes, as Elasticsearch does', () => {
    // U+FF21 sorts after U+1F600 in UTF-16 code units, but before it in UTF-8 bytes.
    expect(compareSortValues(['Ａ'], ['\u{1F600}'], 'asc')).toBeLessThan(0);
    expect(compareSortValues(['B'], ['a'], 'asc')).toBeLessThan(0);
  });
});
