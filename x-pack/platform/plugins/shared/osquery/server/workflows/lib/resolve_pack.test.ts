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

const notFoundWithReason = (reason: string) =>
  new KibanaApiCallError({
    status: 404,
    headers: {},
    body: { message: 'nope', attributes: { reason } },
    message: 'nope',
  });

describe('resolvePack', () => {
  it('reads the pack by id and lists the ecs keys of the enabled queries only', async () => {
    const contextManager = createContextManager({ [READ_PACK]: () => PACK });

    await expect(resolvePack(contextManager, { pack_id: 'pack-so-id' })).resolves.toEqual({
      packId: 'pack-so-id',
      ecsKeysByQuery: { cron: ['cron.command'], launchd: [] },
    });
    expect(contextManager.callKibanaApi).toHaveBeenCalledTimes(1);
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

  it('encodes the prebuilt name or id in the path', async () => {
    const contextManager = createContextManager({
      'GET /internal/osquery/packs/_resolve_prebuilt/a%2Fb': () => ({ pack_id: 'pack-so-id' }),
      [READ_PACK]: () => PACK,
    });

    await expect(resolvePack(contextManager, { prebuilt_pack: 'a/b' })).resolves.toMatchObject({
      packId: 'pack-so-id',
    });
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
    const contextManager = createContextManager({ [READ_PACK]: () => apiError(404) });

    await expect(resolvePack(contextManager, { pack_id: 'pack-so-id' })).rejects.toMatchObject({
      details: { code: 'PACK_NOT_FOUND' },
    });
  });

  it('fails with PACK_NOT_FOUND for an empty pack_id, without any call', async () => {
    const contextManager = createContextManager({});

    await expect(resolvePack(contextManager, { pack_id: '  ' })).rejects.toMatchObject({
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
    const contextManager = createContextManager({ [READ_PACK]: () => apiError(403, 'Forbidden') });

    await expect(resolvePack(contextManager, { pack_id: 'pack-so-id' })).rejects.toMatchObject({
      details: { code: 'MISSING_PRIVILEGE' },
    });
  });

  it('rejects a {{…}} placeholder in an enabled query with SAVED_QUERY_HAS_PLACEHOLDERS', async () => {
    const contextManager = createContextManager({
      [READ_PACK]: () => ({
        data: { queries: { ok: { query: 'SELECT 1' }, bad: { query: "SELECT '{{host.name}}'" } } },
      }),
    });

    const error = (await resolvePack(contextManager, { pack_id: 'pack-so-id' }).catch(
      (e) => e
    )) as Error;

    expect((error as never as { details: unknown }).details).toEqual({
      code: 'SAVED_QUERY_HAS_PLACEHOLDERS',
    });
    expect(error.message).toContain('bad');
  });

  it('ignores placeholders in a disabled query', async () => {
    const contextManager = createContextManager({
      [READ_PACK]: () => ({
        data: {
          queries: {
            ok: { query: 'SELECT 1' },
            off: { query: 'SELECT {{ x }}', enabled: false },
          },
        },
      }),
    });

    await expect(resolvePack(contextManager, { pack_id: 'pack-so-id' })).resolves.toMatchObject({
      ecsKeysByQuery: { ok: [] },
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
    const contextManager = createContextManager({ [READ_PACK]: () => body });

    await expect(resolvePack(contextManager, { pack_id: 'pack-so-id' })).rejects.toMatchObject({
      details: { code: 'REQUEST_REJECTED' },
      message: expect.stringContaining('no enabled queries'),
    });
  });
});
