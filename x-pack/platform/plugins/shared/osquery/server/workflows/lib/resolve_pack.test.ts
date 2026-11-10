/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { PREBUILT_PACK_RESOLVE_REASON } from '../../../common/prebuilt_packs';
import { resolvePack } from './resolve_pack';
import { apiError, createContextManager } from '../test_helpers';

const FIND_PACKS = 'GET /api/osquery/packs';
const READ_PACK = 'GET /api/osquery/packs/pack-so-id';
const RESOLVE = 'GET /internal/osquery/packs/_resolve_prebuilt/forensic-persistence';

const PACK = {
  data: {
    queries: {
      cron: {
        query: 'SELECT * FROM crontab',
        ecs_mapping: { 'cron.command': { field: 'command' } },
      },
      launchd: { query: 'SELECT * FROM launchd' },
      off: { query: 'SELECT {{ x }}', enabled: false },
    },
  },
};

const FIND_ONE = { total: 1, data: [{ saved_object_id: 'pack-so-id', name: 'My pack' }] };

const notFoundWithReason = (reason: string) =>
  new KibanaApiCallError({
    status: 404,
    headers: {},
    body: { message: 'nope', attributes: { reason } },
    message: 'nope',
  });

describe('resolvePack', () => {
  it('finds the pack by name, validates it and returns only its id', async () => {
    const contextManager = createContextManager({
      [FIND_PACKS]: () => FIND_ONE,
      [READ_PACK]: () => PACK,
    });

    await expect(resolvePack(contextManager, { pack: 'My pack' })).resolves.toEqual({
      packId: 'pack-so-id',
    });
    expect(contextManager.callKibanaApi).toHaveBeenCalledTimes(2);
  });

  it('resolves prebuilt_pack through the internal route, then reads the space copy', async () => {
    const contextManager = createContextManager({
      [RESOLVE]: () => ({ pack_id: 'pack-so-id' }),
      [READ_PACK]: () => PACK,
    });

    const { packId } = await resolvePack(contextManager, { prebuilt_pack: 'forensic-persistence' });

    expect(packId).toBe('pack-so-id');
    expect(contextManager.callKibanaApi.mock.calls[0][0]).toMatchObject({
      path: '/internal/osquery/packs/_resolve_prebuilt/forensic-persistence',
      headers: { 'elastic-api-version': '1' },
    });
  });

  it.each(['a/b', 'a%2Fb', 'a%2fb', 'a\\b', '.', '..', 'a\u0000b', 'a\u007fb', '\ud800'])(
    'rejects invalid prebuilt path identifier %s before any API call',
    async (prebuiltPack) => {
      const contextManager = createContextManager({});

      await expect(
        resolvePack(contextManager, { prebuilt_pack: prebuiltPack })
      ).rejects.toMatchObject({
        type: 'ValidationError',
        details: { code: 'INVALID_INPUT' },
      });
      expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
    }
  );

  it.each(['a/b', 'a%2Fb', 'a\\b', '.', '..'])(
    'rejects invalid resolved pack id %s before reading the pack',
    async (packId) => {
      const contextManager = createContextManager({
        [FIND_PACKS]: () => ({ total: 1, data: [{ saved_object_id: packId, name: 'My pack' }] }),
      });

      await expect(resolvePack(contextManager, { pack: 'My pack' })).rejects.toMatchObject({
        details: { code: 'INVALID_INPUT' },
      });
      expect(contextManager.callKibanaApi).toHaveBeenCalledTimes(1);
    }
  );

  it('rejects an invalid id returned by prebuilt resolution before reading the pack', async () => {
    const contextManager = createContextManager({ [RESOLVE]: () => ({ pack_id: 'a/b' }) });

    await expect(
      resolvePack(contextManager, { prebuilt_pack: 'forensic-persistence' })
    ).rejects.toMatchObject({ details: { code: 'INVALID_INPUT' } });
    expect(contextManager.callKibanaApi).toHaveBeenCalledTimes(1);
  });

  it('fails with PREBUILT_PACK_NOT_LOADED on a 404 that says the pack is not loaded', async () => {
    const contextManager = createContextManager({
      [RESOLVE]: () => notFoundWithReason(PREBUILT_PACK_RESOLVE_REASON.notLoaded),
    });

    await expect(
      resolvePack(contextManager, { prebuilt_pack: 'forensic-persistence' })
    ).rejects.toMatchObject({
      details: { code: 'PREBUILT_PACK_NOT_LOADED' },
      message: expect.stringContaining('Load Elastic prebuilt packs in this space'),
    });
  });

  it('keeps the code but tells a mistyped name apart from a pack that is not loaded', async () => {
    const contextManager = createContextManager({
      [RESOLVE]: () => notFoundWithReason(PREBUILT_PACK_RESOLVE_REASON.unknownAsset),
    });

    const error = (await resolvePack(contextManager, {
      prebuilt_pack: 'forensic-persistence',
    }).catch((e) => e)) as Error;

    expect((error as never as { details: unknown }).details).toEqual({
      code: 'PREBUILT_PACK_NOT_LOADED',
    });
    expect(error.message).toMatch(/No prebuilt pack/);
    expect(error.message).not.toMatch(/Load Elastic prebuilt packs/);
  });

  it('treats a 404 without a reason as not loaded', async () => {
    const contextManager = createContextManager({ [RESOLVE]: () => apiError(404) });

    await expect(
      resolvePack(contextManager, { prebuilt_pack: 'forensic-persistence' })
    ).rejects.toMatchObject({ details: { code: 'PREBUILT_PACK_NOT_LOADED' } });
  });

  it('fails with PREBUILT_PACK_AMBIGUOUS on a 409', async () => {
    const contextManager = createContextManager({ [RESOLVE]: () => apiError(409) });

    await expect(
      resolvePack(contextManager, { prebuilt_pack: 'forensic-persistence' })
    ).rejects.toMatchObject({ details: { code: 'PREBUILT_PACK_AMBIGUOUS' } });
  });

  it('fails with MISSING_PRIVILEGE on a 403 from the resolve route', async () => {
    const contextManager = createContextManager({ [RESOLVE]: () => apiError(403, 'Forbidden') });

    await expect(
      resolvePack(contextManager, { prebuilt_pack: 'forensic-persistence' })
    ).rejects.toMatchObject({ details: { code: 'MISSING_PRIVILEGE' } });
  });

  it('rethrows a 5xx from the resolve route as is', async () => {
    const contextManager = createContextManager({ [RESOLVE]: () => apiError(500) });

    await expect(
      resolvePack(contextManager, { prebuilt_pack: 'forensic-persistence' })
    ).rejects.toBeInstanceOf(KibanaApiCallError);
  });

  it('fails with PACK_NOT_FOUND on a 404 reading the pack', async () => {
    const contextManager = createContextManager({
      [FIND_PACKS]: () => FIND_ONE,
      [READ_PACK]: () => apiError(404),
    });

    await expect(resolvePack(contextManager, { pack: 'My pack' })).rejects.toMatchObject({
      details: { code: 'PACK_NOT_FOUND' },
    });
  });

  it('fails with PACK_NOT_FOUND for an empty pack name, without any call', async () => {
    const contextManager = createContextManager({});

    await expect(resolvePack(contextManager, { pack: '  ' })).rejects.toMatchObject({
      details: { code: 'PACK_NOT_FOUND' },
    });
    expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
  });

  it('fails with PREBUILT_PACK_NOT_LOADED for an empty prebuilt_pack, without any call', async () => {
    const contextManager = createContextManager({});

    await expect(resolvePack(contextManager, { prebuilt_pack: ' ' })).rejects.toMatchObject({
      details: { code: 'PREBUILT_PACK_NOT_LOADED' },
    });
    expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
  });

  it('fails with MISSING_PRIVILEGE on a 403 reading the pack', async () => {
    const contextManager = createContextManager({
      [FIND_PACKS]: () => FIND_ONE,
      [READ_PACK]: () => apiError(403, 'Forbidden'),
    });

    await expect(resolvePack(contextManager, { pack: 'My pack' })).rejects.toMatchObject({
      details: { code: 'MISSING_PRIVILEGE' },
    });
  });

  it('rejects a {{…}} placeholder in an enabled query with PACK_QUERY_HAS_PLACEHOLDERS', async () => {
    const contextManager = createContextManager({
      [FIND_PACKS]: () => FIND_ONE,
      [READ_PACK]: () => ({
        data: { queries: { ok: { query: 'SELECT 1' }, bad: { query: "SELECT '{{host.name}}'" } } },
      }),
    });

    const error = (await resolvePack(contextManager, { pack: 'My pack' }).catch((e) => e)) as Error;

    expect((error as never as { details: unknown }).details).toEqual({
      code: 'PACK_QUERY_HAS_PLACEHOLDERS',
    });
    expect(error.message).toContain('bad');
  });

  it('ignores placeholders in a disabled query', async () => {
    const contextManager = createContextManager({
      [FIND_PACKS]: () => FIND_ONE,
      [READ_PACK]: () => ({
        data: {
          queries: {
            ok: { query: 'SELECT 1' },
            off: { query: 'SELECT {{ x }}', enabled: false },
          },
        },
      }),
    });

    await expect(resolvePack(contextManager, { pack: 'My pack' })).resolves.toMatchObject({
      packId: 'pack-so-id',
    });
  });

  it.each([
    ['no queries', { data: { queries: {} } }],
    ['no data', {}],
    [
      'only disabled queries',
      { data: { queries: { off: { query: 'SELECT 1', enabled: false } } } },
    ],
  ])('fails before dispatch when the pack has %s', async (_name, body) => {
    const contextManager = createContextManager({
      [FIND_PACKS]: () => FIND_ONE,
      [READ_PACK]: () => body,
    });

    await expect(resolvePack(contextManager, { pack: 'My pack' })).rejects.toMatchObject({
      details: { code: 'PACK_HAS_NO_ENABLED_QUERIES' },
      message: expect.stringContaining('no enabled queries'),
    });
  });

  describe('resolving a pack by name', () => {
    it('keeps the exact-name match among fuzzy search hits', async () => {
      const find = jest.fn(() => ({
        total: 3,
        data: [
          { saved_object_id: 'so-other', name: 'My pack 2' },
          { saved_object_id: 'pack-so-id', name: 'My pack' },
          { saved_object_id: 'so-lower', name: 'my pack' },
        ],
      }));
      const contextManager = createContextManager({ [FIND_PACKS]: find, [READ_PACK]: () => PACK });

      await expect(resolvePack(contextManager, { pack: 'My pack' })).resolves.toMatchObject({
        packId: 'pack-so-id',
      });
      expect(contextManager.callKibanaApi.mock.calls[0][0]).toMatchObject({
        method: 'GET',
        path: '/api/osquery/packs',
        query: { search: '"My pack"', page: 1, pageSize: 100 },
        headers: { 'elastic-api-version': '2023-10-31' },
      });
      expect(contextManager.callKibanaApi.mock.calls[1][0]).toMatchObject({
        path: '/api/osquery/packs/pack-so-id',
      });
    });

    it('fails with PACK_NOT_FOUND when no pack has exactly that name', async () => {
      const contextManager = createContextManager({
        [FIND_PACKS]: () => ({
          total: 1,
          data: [{ saved_object_id: 'so-other', name: 'My pack 2' }],
        }),
      });

      await expect(resolvePack(contextManager, { pack: 'My pack' })).rejects.toMatchObject({
        details: { code: 'PACK_NOT_FOUND' },
        message: expect.stringContaining('No pack is named "My pack"'),
      });
      expect(contextManager.callKibanaApi).toHaveBeenCalledTimes(1);
    });

    it('fails with PACK_NOT_FOUND when the search returns nothing', async () => {
      const contextManager = createContextManager({ [FIND_PACKS]: () => ({ total: 0, data: [] }) });

      await expect(resolvePack(contextManager, { pack: 'My pack' })).rejects.toMatchObject({
        details: { code: 'PACK_NOT_FOUND' },
      });
    });

    it('fails with PACK_AMBIGUOUS instead of guessing when the page cap ends the search early', async () => {
      const fullPage = Array.from({ length: 100 }, (_, i) => ({
        saved_object_id: `so-${i}`,
        name: i === 0 ? 'My pack' : `My pack ${i}`,
      }));
      const find = jest.fn(() => ({ total: 5000, data: fullPage }));
      const contextManager = createContextManager({ [FIND_PACKS]: find });

      await expect(resolvePack(contextManager, { pack: 'My pack' })).rejects.toMatchObject({
        details: { code: 'PACK_AMBIGUOUS' },
        message: expect.stringContaining('Too many packs match'),
      });
      expect(find).toHaveBeenCalledTimes(10);
    });

    it('fails with PACK_AMBIGUOUS when more than one pack has the name', async () => {
      const contextManager = createContextManager({
        [FIND_PACKS]: () => ({
          total: 2,
          data: [
            { saved_object_id: 'so-1', name: 'My pack' },
            { saved_object_id: 'so-2', name: 'My pack' },
          ],
        }),
      });

      await expect(resolvePack(contextManager, { pack: 'My pack' })).rejects.toMatchObject({
        details: { code: 'PACK_AMBIGUOUS' },
        message: expect.stringContaining('More than one pack is named "My pack"'),
      });
      expect(contextManager.callKibanaApi).toHaveBeenCalledTimes(1);
    });

    it('reads page 2 when page 1 is full and the total says there is more', async () => {
      const fuzzy = Array.from({ length: 100 }, (_, index) => ({
        saved_object_id: `so-fuzzy-${index}`,
        name: `My pack ${index}`,
      }));
      const find = jest.fn(({ query }: { query?: Record<string, unknown> }) =>
        query?.page === 1
          ? { total: 101, data: fuzzy }
          : { total: 101, data: [{ saved_object_id: 'pack-so-id', name: 'My pack' }] }
      );
      const contextManager = createContextManager({ [FIND_PACKS]: find, [READ_PACK]: () => PACK });

      await expect(resolvePack(contextManager, { pack: 'My pack' })).resolves.toMatchObject({
        packId: 'pack-so-id',
      });
      expect(find).toHaveBeenCalledTimes(2);
      expect(contextManager.callKibanaApi.mock.calls[1][0]).toMatchObject({
        query: { search: '"My pack"', page: 2, pageSize: 100 },
      });
    });

    it('deduplicates the same pack id when an update shifts it onto the next page', async () => {
      const match = { saved_object_id: 'pack-so-id', name: 'My pack' };
      const firstPage = [
        match,
        ...Array.from({ length: 99 }, (_, index) => ({
          saved_object_id: `fuzzy-${index}`,
          name: `My pack ${index}`,
        })),
      ];
      const find = jest.fn(({ query }: { query?: Record<string, unknown> }) => ({
        total: 101,
        data: query?.page === 1 ? firstPage : [match],
      }));
      const contextManager = createContextManager({ [FIND_PACKS]: find, [READ_PACK]: () => PACK });

      await expect(resolvePack(contextManager, { pack: 'My pack' })).resolves.toEqual({
        packId: 'pack-so-id',
      });
      expect(find).toHaveBeenCalledTimes(2);
    });

    it('scans without search for a name with no searchable terms', async () => {
      const contextManager = createContextManager({
        [FIND_PACKS]: () => ({
          total: 2,
          data: [
            { saved_object_id: 'other', name: '--' },
            { saved_object_id: 'pack-so-id', name: '---' },
          ],
        }),
        [READ_PACK]: () => PACK,
      });

      await expect(resolvePack(contextManager, { pack: '---' })).resolves.toEqual({
        packId: 'pack-so-id',
      });
      expect(contextManager.callKibanaApi.mock.calls[0][0].query).toEqual({
        page: 1,
        pageSize: 100,
      });
    });

    it('preserves whitespace when searching and matching pack names', async () => {
      const contextManager = createContextManager({
        [FIND_PACKS]: () => ({
          total: 2,
          data: [
            { saved_object_id: 'other', name: 'My pack' },
            { saved_object_id: 'pack-so-id', name: ' My pack ' },
          ],
        }),
        [READ_PACK]: () => PACK,
      });

      await expect(resolvePack(contextManager, { pack: ' My pack ' })).resolves.toEqual({
        packId: 'pack-so-id',
      });
      expect(contextManager.callKibanaApi.mock.calls[0][0].query?.search).toBe('" My pack "');
    });

    it('stops after a short page', async () => {
      const find = jest.fn(() => ({ total: 500, data: [] }));
      const contextManager = createContextManager({ [FIND_PACKS]: find });

      await expect(resolvePack(contextManager, { pack: 'My pack' })).rejects.toMatchObject({
        details: { code: 'PACK_NOT_FOUND' },
      });
      expect(find).toHaveBeenCalledTimes(1);
    });

    it('escapes quotes and backslashes in the search phrase', async () => {
      const contextManager = createContextManager({
        [FIND_PACKS]: () => ({
          total: 1,
          data: [{ saved_object_id: 'pack-so-id', name: 'a"b\\c' }],
        }),
        [READ_PACK]: () => PACK,
      });

      await resolvePack(contextManager, { pack: 'a"b\\c' });

      expect(contextManager.callKibanaApi.mock.calls[0][0]).toMatchObject({
        query: { search: '"a\\"b\\\\c"' },
      });
    });

    it('maps a 403 from the find route like the other read errors', async () => {
      const contextManager = createContextManager({
        [FIND_PACKS]: () => apiError(403, 'Forbidden'),
      });

      await expect(resolvePack(contextManager, { pack: 'My pack' })).rejects.toMatchObject({
        details: { code: 'MISSING_PRIVILEGE' },
      });
    });

    it('names the pack by its workflow label in later errors, not the saved-object id', async () => {
      const contextManager = createContextManager({
        [FIND_PACKS]: () => FIND_ONE,
        [READ_PACK]: () => ({ data: { queries: {} } }),
      });

      await expect(resolvePack(contextManager, { pack: 'My pack' })).rejects.toMatchObject({
        message: expect.stringContaining('Pack "My pack" has no enabled queries'),
      });
    });
  });
});
