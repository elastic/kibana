/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { SelectionContext } from '@kbn/workflows/types/latest';
import { createSavedQuerySelection } from './saved_query_selection';
import { createPackSelection } from './pack_selection';
import { createPrebuiltPackSelection } from './prebuilt_pack_selection';

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

    it('does not call the API for an empty value, and swallows request errors', async () => {
      const selection = createSavedQuerySelection(http);

      expect(await selection.resolve('  ', context('saved_query'))).toBeNull();
      expect(http.get).not.toHaveBeenCalled();

      http.get.mockRejectedValue(new Error('403'));
      expect(await selection.search('x', context('saved_query'))).toEqual([]);
      expect(await selection.resolve('x', context('saved_query'))).toBeNull();
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

  describe('createPackSelection', () => {
    it('shows pack names but stores the saved-object id', async () => {
      http.get.mockResolvedValue({
        data: [{ saved_object_id: 'pack-so-1', name: 'My pack', queries: { a: {}, b: {} } }],
      });

      const [option] = await createPackSelection(http).search('my', context('pack_id'));

      expect(http.get).toHaveBeenCalledWith('/api/osquery/packs', {
        version: '2023-10-31',
        query: { page: 1, pageSize: 20, search: 'my*' },
      });
      expect(option).toEqual({
        value: 'pack-so-1',
        label: 'My pack',
        description: '',
        documentation: '2 queries',
      });
    });

    it('resolves an id to its name through the read route', async () => {
      http.get.mockResolvedValue({ data: { name: 'My pack', queries: { a: {} } } });

      const option = await createPackSelection(http).resolve('pack/so 1', context('pack_id'));

      expect(http.get).toHaveBeenCalledWith('/api/osquery/packs/pack%2Fso%201', {
        version: '2023-10-31',
      });
      expect(option).toMatchObject({
        value: 'pack/so 1',
        label: 'My pack',
        documentation: '1 query',
      });
    });

    it('resolves an unknown id to null', async () => {
      http.get.mockRejectedValue(new Error('Not Found'));

      expect(await createPackSelection(http).resolve('nope', context('pack_id'))).toBeNull();
    });
  });

  describe('createPrebuiltPackSelection', () => {
    const packs = [
      {
        asset_id: 'osquery_manager-1',
        asset_name: 'forensic-persistence',
        name: 'forensic-persistence-elastic',
        query_count: 12,
      },
      {
        asset_id: 'osquery_manager-2',
        asset_name: 'it-compliance',
        name: 'it-compliance',
        query_count: 3,
      },
    ];

    it('lists the loaded prebuilt packs and stores the package name', async () => {
      http.get.mockResolvedValue({ data: packs });

      const options = await createPrebuiltPackSelection(http).search(
        'FORENSIC',
        context('prebuilt_pack')
      );

      expect(http.get).toHaveBeenCalledWith('/internal/osquery/packs/_prebuilt', { version: '1' });
      expect(options).toEqual([
        {
          value: 'forensic-persistence',
          label: 'forensic-persistence',
          description: 'forensic-persistence-elastic',
          documentation: '12 queries',
        },
      ]);
    });

    it('resolves a loaded name or asset id and returns null for one that is not loaded', async () => {
      http.get.mockResolvedValue({ data: packs });
      const selection = createPrebuiltPackSelection(http);

      expect((await selection.resolve('it-compliance', context('prebuilt_pack')))?.value).toBe(
        'it-compliance'
      );
      expect((await selection.resolve('osquery_manager-1', context('prebuilt_pack')))?.value).toBe(
        'forensic-persistence'
      );
      expect(await selection.resolve('ot-pack', context('prebuilt_pack'))).toBeNull();
    });

    it('tells the user to load prebuilt packs when the pack is missing', async () => {
      const details = await createPrebuiltPackSelection(http).getDetails(
        'ot-pack',
        context('prebuilt_pack'),
        null
      );

      expect(details.message).toContain('Load Elastic prebuilt packs in this space');
    });
  });
});
