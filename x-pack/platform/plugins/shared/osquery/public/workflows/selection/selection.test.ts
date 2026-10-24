/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { SelectionContext } from '@kbn/workflows/types/latest';
import { createSavedQuerySelection } from './saved_query_selection';

const context = (propertyKey: string): SelectionContext => ({
  stepType: 'osquery.runQuery',
  scope: 'input',
  propertyKey,
  values: { config: {}, input: {} },
});

describe('osquery workflow step pickers', () => {
  let http: ReturnType<typeof httpServiceMock.createSetupContract>;

  beforeEach(() => {
    http = httpServiceMock.createSetupContract();
  });

  describe('createSavedQuerySelection', () => {
    const procs = {
      id: 'procs_linux',
      description: 'Running processes',
      query: 'SELECT pid FROM processes',
      saved_object_id: 'so-1',
    };

    it('searches through core http with the public API version and stores the name', async () => {
      http.get.mockResolvedValue({ data: [procs] });

      const options = await createSavedQuerySelection(http).search(
        ' procs ',
        context('saved_query')
      );

      expect(http.get).toHaveBeenCalledWith('/api/osquery/saved_queries', {
        version: '2023-10-31',
        query: { page: 1, pageSize: 20, sort: 'id', sortOrder: 'asc', search: 'procs' },
      });
      expect(options).toEqual([
        {
          value: 'procs_linux',
          label: 'procs_linux',
          description: 'Running processes',
          documentation: 'SELECT pid FROM processes',
        },
      ]);
    });

    it('lists without a search filter for an empty input', async () => {
      http.get.mockResolvedValue({ data: [] });

      await createSavedQuerySelection(http).search('', context('saved_query'));

      expect((http.get.mock.calls[0] as unknown[])[1]).toEqual({
        version: '2023-10-31',
        query: { page: 1, pageSize: 20, sort: 'id', sortOrder: 'asc' },
      });
    });

    it('resolves by exact name, not by fuzzy search', async () => {
      http.get.mockResolvedValue({ data: [procs] });

      const option = await createSavedQuerySelection(http).resolve(
        'procs_linux',
        context('saved_query')
      );

      expect((http.get.mock.calls[0] as unknown[])[1]).toEqual({
        version: '2023-10-31',
        query: { id: 'procs_linux', page: 1, pageSize: 2 },
      });
      expect(option?.value).toBe('procs_linux');
    });

    it('resolves to null for no match, a different name, or duplicates', async () => {
      const selection = createSavedQuerySelection(http);

      http.get.mockResolvedValueOnce({ data: [] });
      expect(await selection.resolve('procs_linux', context('saved_query'))).toBeNull();

      http.get.mockResolvedValueOnce({ data: [{ ...procs, id: 'other' }] });
      expect(await selection.resolve('procs_linux', context('saved_query'))).toBeNull();

      http.get.mockResolvedValueOnce({ data: [procs, procs] });
      expect(await selection.resolve('procs_linux', context('saved_query'))).toBeNull();
    });

    it('does not call the API for an empty value', async () => {
      const selection = createSavedQuerySelection(http);

      expect(await selection.resolve('  ', context('saved_query'))).toBeNull();
      expect(http.get).not.toHaveBeenCalled();
    });

    it('reports a failed lookup instead of a missing saved query', async () => {
      const selection = createSavedQuerySelection(http);
      http.get.mockRejectedValue({ message: 'Forbidden', body: { message: 'Forbidden' } });

      expect(await selection.search('x', context('saved_query'))).toEqual([]);
      expect(await selection.resolve('x', context('saved_query'))).toBeNull();

      const details = await selection.getDetails('x', context('saved_query'), null);
      expect(details.message).toMatch(/Forbidden/);
      expect(details.message).not.toMatch(/install/i);
    });

    it('explains how to fix a missing saved query', async () => {
      const details = await createSavedQuerySelection(http).getDetails(
        'missing',
        context('saved_query'),
        null
      );

      expect(details.message).toMatch(/install/i);
      expect(details.links?.[0].path).toBe('/app/osquery/saved_queries');
    });
  });
});
