/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { SelectionContext } from '@kbn/workflows/types/latest';
import { createPackSelection } from './pack_selection';
import { createPrebuiltPackSelection } from './prebuilt_pack_selection';
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

    it('reports a failed lookup only for the value it failed on', async () => {
      const selection = createSavedQuerySelection(http);
      http.get.mockRejectedValueOnce({ body: { message: 'Forbidden' } });

      expect(await selection.resolve('denied', context('saved_query'))).toBeNull();
      http.get.mockResolvedValueOnce({ data: [] });
      expect(await selection.resolve('other', context('saved_query'))).toBeNull();

      const denied = await selection.getDetails('denied', context('saved_query'), null);
      const other = await selection.getDetails('other', context('saved_query'), null);

      expect(denied.message).toMatch(/Forbidden/);
      expect(other.message).not.toMatch(/Forbidden/);
      expect(other.message).toMatch(/install/i);
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

    it('prefixes the manage link with the current space', async () => {
      const spacedHttp = httpServiceMock.createSetupContract({ basePath: '/s/my-space' });

      const details = await createSavedQuerySelection(spacedHttp).getDetails(
        'missing',
        context('saved_query'),
        null
      );

      expect(details.links?.[0].path).toBe('/s/my-space/app/osquery/saved_queries');
    });
  });

  describe('createPackSelection', () => {
    const pack = {
      saved_object_id: 'pack-so-1',
      name: 'My pack',
      description: 'Does things',
      queries: { a: { query: 'SELECT 1' }, b: { query: 'SELECT 2' } },
    };

    it('searches through core http with the public API version and stores the pack name', async () => {
      http.get.mockResolvedValue({ data: [pack] });

      const options = await createPackSelection(http).search(' my ', context('pack'));

      expect(http.get).toHaveBeenCalledWith('/api/osquery/packs', {
        version: '2023-10-31',
        query: { page: 1, pageSize: 20, search: 'my*' },
      });
      expect(options).toEqual([
        {
          value: 'My pack',
          label: 'My pack',
          description: 'Does things',
          documentation: '2 queries',
        },
      ]);
    });

    it('strips simple_query_string operators the user typed before adding the trailing *', async () => {
      http.get.mockResolvedValue({ data: [] });
      const selection = createPackSelection(http);

      await selection.search('alpha|beta', context('pack'));
      await selection.search('"(*)"', context('pack'));

      expect((http.get.mock.calls[0] as unknown[])[1]).toEqual({
        version: '2023-10-31',
        query: { page: 1, pageSize: 20, search: 'alphabeta*' },
      });
      // Nothing left after stripping: list without a filter rather than send a bare `*`.
      expect((http.get.mock.calls[1] as unknown[])[1]).toEqual({
        version: '2023-10-31',
        query: { page: 1, pageSize: 20 },
      });
    });

    it('lists without a search filter for an empty input', async () => {
      http.get.mockResolvedValue({ data: [] });

      await createPackSelection(http).search('', context('pack'));

      expect((http.get.mock.calls[0] as unknown[])[1]).toEqual({
        version: '2023-10-31',
        query: { page: 1, pageSize: 20 },
      });
    });

    it('counts the queries of a pack stored as an array', async () => {
      http.get.mockResolvedValue({ data: [{ ...pack, queries: [{}] }] });

      const [option] = await createPackSelection(http).search('', context('pack'));

      expect(option.documentation).toBe('1 query');
    });

    it('resolves a pack name by exact match through a quoted search', async () => {
      http.get.mockResolvedValue({ data: [pack] });

      const option = await createPackSelection(http).resolve(' My pack ', context('pack'));

      expect(http.get).toHaveBeenCalledWith('/api/osquery/packs', {
        version: '2023-10-31',
        query: { page: 1, pageSize: 100, search: '"My pack"' },
      });
      expect(option).toMatchObject({ value: 'My pack', label: 'My pack' });
    });

    it('ignores fuzzy search hits whose name is not exactly the value', async () => {
      http.get.mockResolvedValue({
        data: [{ ...pack, name: 'My pack 2' }, pack, { ...pack, name: 'my pack' }],
      });

      const option = await createPackSelection(http).resolve('My pack', context('pack'));

      expect(option).toMatchObject({ value: 'My pack' });
    });

    it('resolves to null when only fuzzy hits come back and says no pack has the name', async () => {
      const selection = createPackSelection(http);
      http.get.mockResolvedValue({ data: [{ ...pack, name: 'My pack 2' }] });

      expect(await selection.resolve('My pack', context('pack'))).toBeNull();
      const details = await selection.getDetails('My pack', context('pack'), null);

      expect(details.message).toBe('No pack named "My pack" in this space.');
    });

    it('resolves to null for duplicates and says the name is ambiguous', async () => {
      const selection = createPackSelection(http);
      http.get.mockResolvedValue({
        data: [pack, { ...pack, saved_object_id: 'pack-so-2' }],
      });

      expect(await selection.resolve('My pack', context('pack'))).toBeNull();
      const details = await selection.getDetails('My pack', context('pack'), null);

      expect(details.message).toContain('More than one pack has this name');
    });

    it('escapes quotes and backslashes in the search phrase', async () => {
      http.get.mockResolvedValue({ data: [] });

      await createPackSelection(http).resolve('a"b', context('pack'));
      await createPackSelection(http).resolve('a\\b', context('pack'));

      expect((http.get.mock.calls[0] as unknown[])[1]).toEqual({
        version: '2023-10-31',
        query: { page: 1, pageSize: 100, search: '"a\\"b"' },
      });
      expect((http.get.mock.calls[1] as unknown[])[1]).toEqual({
        version: '2023-10-31',
        query: { page: 1, pageSize: 100, search: '"a\\\\b"' },
      });
    });

    it('does not call the API for an empty value', async () => {
      expect(await createPackSelection(http).resolve(' ', context('pack'))).toBeNull();
      expect(http.get).not.toHaveBeenCalled();
    });

    it('reports a failed lookup instead of a missing pack, only for the value it failed on', async () => {
      const selection = createPackSelection(http);
      http.get.mockRejectedValueOnce({ status: 403, body: { message: 'Forbidden' } });

      expect(await selection.resolve('denied', context('pack'))).toBeNull();
      http.get.mockResolvedValueOnce({ data: [] });
      expect(await selection.resolve('other', context('pack'))).toBeNull();

      const denied = await selection.getDetails('denied', context('pack'), null);
      const other = await selection.getDetails('other', context('pack'), null);

      expect(denied.message).toMatch(/Forbidden/);
      expect(denied.message).not.toMatch(/No pack named/);
      expect(other.message).toMatch(/No pack named "other" in this space/);
    });

    it('reports a 404 on lookup as a failed lookup', async () => {
      const selection = createPackSelection(http);
      http.get.mockRejectedValue({ status: 404, body: { message: 'Not found' } });

      expect(await selection.resolve('nope', context('pack'))).toBeNull();
      const details = await selection.getDetails('nope', context('pack'), null);

      expect(details.message).toMatch(/Could not load packs/);
    });

    it('reports a failed search in the details too', async () => {
      const selection = createPackSelection(http);
      http.get.mockRejectedValue({ message: 'Network down' });

      expect(await selection.search('x', context('pack'))).toEqual([]);

      const details = await selection.getDetails('x', context('pack'), null);
      expect(details.message).toMatch(/Network down/);
    });

    it('describes a found pack and links to packs with the space prefix', async () => {
      const spacedHttp = httpServiceMock.createSetupContract({ basePath: '/s/my-space' });

      const details = await createPackSelection(spacedHttp).getDetails('My pack', context('pack'), {
        value: 'My pack',
        label: 'My pack',
      });

      expect(details.message).toMatch(/My pack/);
      expect(details.links?.[0].path).toBe('/s/my-space/app/osquery/packs');
    });
  });

  describe('createPrebuiltPackSelection', () => {
    const persistence = {
      asset_id: 'osquery_manager-1111',
      asset_name: 'forensic-persistence',
      pack_id: 'so-1',
      name: 'forensic-persistence-elastic',
      query_count: 12,
      copies: 1,
    };
    const network = {
      asset_id: 'osquery_manager-2222',
      asset_name: 'network-recon',
      pack_id: 'so-2',
      name: 'network-recon',
      description: 'Network checks',
      query_count: 1,
      copies: 1,
    };

    it('lists the loaded prebuilt packs through the internal route and stores the package name', async () => {
      http.get.mockResolvedValue({ data: [persistence, network] });

      const options = await createPrebuiltPackSelection(http).search('', context('prebuilt_pack'));

      expect(http.get).toHaveBeenCalledWith('/internal/osquery/packs/_prebuilt', {
        version: '1',
      });
      expect(options).toEqual([
        {
          value: 'forensic-persistence',
          label: 'forensic-persistence',
          // Shown only because the space copy was renamed.
          description: 'forensic-persistence-elastic',
          documentation: '12 queries',
        },
        {
          value: 'network-recon',
          label: 'network-recon',
          description: 'Network checks',
          documentation: '1 query',
        },
      ]);
    });

    it('filters by package name or copy name, case-insensitively', async () => {
      http.get.mockResolvedValue({ data: [persistence, network] });
      const selection = createPrebuiltPackSelection(http);

      expect(
        (await selection.search(' PERSIST ', context('prebuilt_pack'))).map((o) => o.value)
      ).toEqual(['forensic-persistence']);
      expect(
        (await selection.search('elastic', context('prebuilt_pack'))).map((o) => o.value)
      ).toEqual(['forensic-persistence']);
    });

    it('shares one list request between parallel lookups, and fetches again afterwards', async () => {
      http.get.mockResolvedValue({ data: [persistence, network] });
      const selection = createPrebuiltPackSelection(http);

      const [first, second] = await Promise.all([
        selection.resolve('forensic-persistence', context('prebuilt_pack')),
        selection.resolve('network-recon', context('prebuilt_pack')),
      ]);

      expect(first).toMatchObject({ value: 'forensic-persistence' });
      expect(second).toMatchObject({ value: 'network-recon' });
      expect(http.get).toHaveBeenCalledTimes(1);

      // Not cached past the request: a pack loaded meanwhile shows up on the next lookup.
      await selection.search('', context('prebuilt_pack'));
      expect(http.get).toHaveBeenCalledTimes(2);
    });

    it('lets the next lookup retry after a shared request failed', async () => {
      http.get.mockRejectedValueOnce({ message: 'Network down' });
      http.get.mockResolvedValueOnce({ data: [persistence] });
      const selection = createPrebuiltPackSelection(http);

      expect(await selection.resolve('forensic-persistence', context('prebuilt_pack'))).toBeNull();
      expect(
        await selection.resolve('forensic-persistence', context('prebuilt_pack'))
      ).toMatchObject({ value: 'forensic-persistence' });
    });

    it('does not offer a pack the step could not resolve', async () => {
      http.get.mockResolvedValue({
        data: [{ ...persistence, copies: 2, unavailable_reason: 'duplicate_copies' }, network],
      });

      const options = await createPrebuiltPackSelection(http).search('', context('prebuilt_pack'));

      expect(options.map((o) => o.value)).toEqual(['network-recon']);
    });

    it('resolves a package name or an asset id to the option, with the name as value', async () => {
      http.get.mockResolvedValue({ data: [persistence, network] });
      const selection = createPrebuiltPackSelection(http);

      expect(
        await selection.resolve('forensic-persistence', context('prebuilt_pack'))
      ).toMatchObject({
        value: 'forensic-persistence',
      });
      expect(
        await selection.resolve('osquery_manager-2222', context('prebuilt_pack'))
      ).toMatchObject({
        value: 'network-recon',
      });
    });

    describe('when several assets share a package name', () => {
      const twin = { ...persistence, asset_id: 'osquery_manager-3333', pack_id: 'so-3' };
      const shared = [
        { ...persistence, unavailable_reason: 'duplicate_asset_name' },
        { ...twin, unavailable_reason: 'duplicate_asset_name' },
      ];

      it('offers each single-copy asset by its asset id', async () => {
        http.get.mockResolvedValue({
          data: [...shared, { ...network, copies: 2, unavailable_reason: 'duplicate_asset_name' }],
        });

        const options = await createPrebuiltPackSelection(http).search(
          '',
          context('prebuilt_pack')
        );

        expect(options.map((o) => o.value)).toEqual([
          'osquery_manager-1111',
          'osquery_manager-3333',
        ]);
      });

      it('resolves an explicit asset id and reports no error', async () => {
        http.get.mockResolvedValue({ data: shared });
        const selection = createPrebuiltPackSelection(http);

        const option = await selection.resolve('osquery_manager-3333', context('prebuilt_pack'));
        expect(option).toMatchObject({ value: 'osquery_manager-3333' });
        const details = await selection.getDetails(
          'osquery_manager-3333',
          context('prebuilt_pack'),
          option
        );
        expect(details.message).toMatch(/Runs this space's copy/);
      });

      it('still rejects the shared name, and an asset id with more than one copy', async () => {
        http.get.mockResolvedValue({
          data: [shared[0], { ...shared[1], copies: 2 }],
        });
        const selection = createPrebuiltPackSelection(http);

        expect(
          await selection.resolve('forensic-persistence', context('prebuilt_pack'))
        ).toBeNull();
        expect(
          await selection.resolve('osquery_manager-3333', context('prebuilt_pack'))
        ).toBeNull();
        const details = await selection.getDetails(
          'osquery_manager-3333',
          context('prebuilt_pack'),
          null
        );
        expect(details.message).toMatch(/more than one/i);
      });
    });

    it('resolves to null for a pack that is not loaded, and explains it', async () => {
      http.get.mockResolvedValue({ data: [network] });
      const selection = createPrebuiltPackSelection(http);

      expect(await selection.resolve('forensic-persistence', context('prebuilt_pack'))).toBeNull();
      const details = await selection.getDetails(
        'forensic-persistence',
        context('prebuilt_pack'),
        null
      );

      expect(details.message).toMatch(/not loaded in this space/);
    });

    it('does not call the API for an empty value', async () => {
      expect(
        await createPrebuiltPackSelection(http).resolve(' ', context('prebuilt_pack'))
      ).toBeNull();
      expect(http.get).not.toHaveBeenCalled();
    });

    it('explains an ambiguous pack instead of calling it not loaded', async () => {
      http.get.mockResolvedValue({
        data: [{ ...persistence, copies: 2, unavailable_reason: 'duplicate_copies' }],
      });
      const selection = createPrebuiltPackSelection(http);

      expect(await selection.resolve('forensic-persistence', context('prebuilt_pack'))).toBeNull();
      const details = await selection.getDetails(
        'forensic-persistence',
        context('prebuilt_pack'),
        null
      );

      expect(details.message).toMatch(/more than one/i);
      expect(details.message).not.toMatch(/not loaded/);
    });

    it('reports a failed lookup instead of a pack that is not loaded', async () => {
      const selection = createPrebuiltPackSelection(http);
      http.get.mockRejectedValue({ status: 403, body: { message: 'Forbidden' } });

      expect(await selection.search('x', context('prebuilt_pack'))).toEqual([]);
      expect(await selection.resolve('x', context('prebuilt_pack'))).toBeNull();

      const details = await selection.getDetails('x', context('prebuilt_pack'), null);
      expect(details.message).toMatch(/Forbidden/);
      expect(details.message).not.toMatch(/not loaded/);
    });

    it('links to packs with the space prefix and describes a found pack', async () => {
      const spacedHttp = httpServiceMock.createSetupContract({ basePath: '/s/my-space' });

      const details = await createPrebuiltPackSelection(spacedHttp).getDetails(
        'network-recon',
        context('prebuilt_pack'),
        { value: 'network-recon', label: 'network-recon' }
      );

      expect(details.message).toMatch(/network-recon/);
      expect(details.links?.[0].path).toBe('/s/my-space/app/osquery/packs');
    });
  });
});
