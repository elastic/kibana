/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { searchSavedObjectsByTitle } from './search_saved_objects_by_title';

describe('searchSavedObjectsByTitle', () => {
  const search = async (title: string) => {
    const find = jest.fn().mockResolvedValue({
      saved_objects: [
        { id: 'so-1', attributes: { title: 'Sales overview' } },
        { id: 'so-2', attributes: {} },
      ],
    });
    const results = await searchSavedObjectsByTitle({
      type: 'dashboard',
      title,
      size: 5,
      savedObjectsClient: { find } as unknown as SavedObjectsClientContract,
    });
    return { find, results };
  };

  it('matches every word of the title start, most recently updated first, and maps the results', async () => {
    const { find, results } = await search('sal');

    expect(find).toHaveBeenCalledWith({
      type: 'dashboard',
      fields: ['title'],
      perPage: 5,
      sort: [{ field: 'updated_at', order: 'desc' }],
      search: 'sal*',
      searchFields: ['title'],
      defaultSearchOperator: 'AND',
    });
    expect(results).toEqual([
      { originId: 'so-1', title: 'Sales overview' },
      { originId: 'so-2', title: 'so-2' },
    ]);
  });

  it('finds titles that start with punctuation, which the search cannot match', async () => {
    const find = jest.fn().mockResolvedValue({
      saved_objects: [
        { id: 'so-1', attributes: { title: '[Elastic Security] Rules' } },
        { id: 'so-2', attributes: { title: 'Sales [draft]' } },
        { id: 'so-3', attributes: {} },
      ],
    });

    const results = await searchSavedObjectsByTitle({
      type: 'dashboard',
      title: '[',
      size: 5,
      savedObjectsClient: { find } as unknown as SavedObjectsClientContract,
    });

    expect(find.mock.calls[0][0]).not.toHaveProperty('search');
    expect(find.mock.calls[0][0].perPage).toBeGreaterThan(5);
    expect(results).toEqual([{ originId: 'so-1', title: '[Elastic Security] Rules' }]);
  });

  it('does not search when the title is empty, and drops the operators of the search', async () => {
    expect((await search('')).find.mock.calls[0][0]).not.toHaveProperty('search');
    expect((await search('logs-* (prod)')).find.mock.calls[0][0].search).toBe('logs prod*');
  });
});
