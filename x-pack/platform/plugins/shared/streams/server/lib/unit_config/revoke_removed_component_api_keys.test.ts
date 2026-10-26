/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { revokeRemovedComponentApiKeys } from './revoke_removed_component_api_keys';

const unit = (sources: Array<{ id: string }>, destinations: Array<{ id: string }>) => ({
  sources,
  destinations,
});

const createClient = ({
  manageAll = true,
  manageOwn = true,
}: { manageAll?: boolean; manageOwn?: boolean } = {}) => {
  const hasPrivileges = jest.fn().mockResolvedValue({
    cluster: { manage_api_key: manageAll, manage_own_api_key: manageOwn },
  });
  const queryApiKeys = jest.fn().mockResolvedValue({ api_keys: [] });
  const invalidateApiKey = jest.fn().mockResolvedValue({ error_count: 0 });
  return {
    client: { security: { hasPrivileges, queryApiKeys, invalidateApiKey } },
    hasPrivileges,
    queryApiKeys,
    invalidateApiKey,
  };
};

describe('revokeRemovedComponentApiKeys', () => {
  it('does nothing when security is disabled or there is no previous unit', async () => {
    const { client, hasPrivileges, invalidateApiKey } = createClient();
    const logger = { error: jest.fn() };

    const results = [
      await revokeRemovedComponentApiKeys({
        client: client as never,
        logger: logger as never,
        isSecurityEnabled: false,
        previousUnit: unit([{ id: 'src-1' }], [{ id: 'dest-1' }]),
        nextUnit: unit([], []),
      }),
      await revokeRemovedComponentApiKeys({
        client: client as never,
        logger: logger as never,
        isSecurityEnabled: true,
        nextUnit: unit([], []),
      }),
    ];

    expect(results).toEqual([{ apiKeysMayRemain: false }, { apiKeysMayRemain: false }]);
    expect(hasPrivileges).not.toHaveBeenCalled();
    expect(invalidateApiKey).not.toHaveBeenCalled();
  });

  it('invalidates every key for removed components when the user can manage all API keys', async () => {
    const { client, queryApiKeys, invalidateApiKey } = createClient();
    queryApiKeys
      .mockResolvedValueOnce({ api_keys: [{ id: 'dest-key' }] })
      .mockResolvedValueOnce({ api_keys: [{ id: 'src-key' }] });

    const result = await revokeRemovedComponentApiKeys({
      client: client as never,
      logger: { error: jest.fn() } as never,
      isSecurityEnabled: true,
      previousUnit: unit(
        [{ id: 'src-keep' }, { id: 'src-gone' }],
        [{ id: 'dest-keep' }, { id: 'dest-gone' }]
      ),
      nextUnit: unit([{ id: 'src-keep' }], [{ id: 'dest-keep' }]),
    });

    expect(queryApiKeys).toHaveBeenCalledTimes(2);
    expect(queryApiKeys.mock.calls[0][0].query.bool.filter).toEqual(
      expect.arrayContaining([{ term: { 'metadata.streams_destination_id': 'dest-gone' } }])
    );
    expect(queryApiKeys.mock.calls[1][0].query.bool.filter).toEqual(
      expect.arrayContaining([
        { term: { 'metadata.source_id': 'src-gone' } },
        { term: { 'metadata.streams_unit_id': 'default' } },
      ])
    );
    expect(invalidateApiKey).toHaveBeenCalledWith({ ids: ['dest-key', 'src-key'] });
    expect(result).toEqual({ apiKeysMayRemain: false });
  });

  it('looks up multiple removed destination ids in one terms query', async () => {
    const { client, queryApiKeys, invalidateApiKey } = createClient();
    queryApiKeys.mockResolvedValueOnce({ api_keys: [{ id: 'dest-a-key' }, { id: 'dest-b-key' }] });

    await revokeRemovedComponentApiKeys({
      client: client as never,
      logger: { error: jest.fn() } as never,
      isSecurityEnabled: true,
      previousUnit: unit([], [{ id: 'dest-keep' }, { id: 'dest-a' }, { id: 'dest-b' }]),
      nextUnit: unit([], [{ id: 'dest-keep' }]),
      unitId: 'default',
    });

    expect(queryApiKeys).toHaveBeenCalledTimes(1);
    expect(queryApiKeys.mock.calls[0][0].query.bool.filter).toEqual(
      expect.arrayContaining([
        { terms: { 'metadata.streams_destination_id': ['dest-a', 'dest-b'] } },
      ])
    );
    expect(invalidateApiKey).toHaveBeenCalledWith({ ids: ['dest-a-key', 'dest-b-key'] });
  });

  it('reports that keys may remain when the user can only manage their own API keys', async () => {
    const { client, queryApiKeys, invalidateApiKey } = createClient({ manageAll: false });
    queryApiKeys.mockResolvedValueOnce({ api_keys: [{ id: 'own-key' }] });

    const result = await revokeRemovedComponentApiKeys({
      client: client as never,
      logger: { error: jest.fn() } as never,
      isSecurityEnabled: true,
      previousUnit: unit([], [{ id: 'dest-gone' }]),
      nextUnit: unit([], []),
    });

    expect(invalidateApiKey).toHaveBeenCalledWith({ ids: ['own-key'] });
    expect(result).toEqual({ apiKeysMayRemain: true });
  });

  it('skips the lookup and reports that keys may remain without any API key privilege', async () => {
    const { client, queryApiKeys, invalidateApiKey } = createClient({
      manageAll: false,
      manageOwn: false,
    });

    const result = await revokeRemovedComponentApiKeys({
      client: client as never,
      logger: { error: jest.fn() } as never,
      isSecurityEnabled: true,
      previousUnit: unit([{ id: 'src-gone' }], []),
      nextUnit: unit([], []),
    });

    expect(queryApiKeys).not.toHaveBeenCalled();
    expect(invalidateApiKey).not.toHaveBeenCalled();
    expect(result).toEqual({ apiKeysMayRemain: true });
  });

  it('reports that keys may remain when invalidation partially fails', async () => {
    const { client, queryApiKeys, invalidateApiKey } = createClient();
    queryApiKeys.mockResolvedValueOnce({ api_keys: [{ id: 'dest-key' }] });
    invalidateApiKey.mockResolvedValueOnce({ error_count: 1 });

    const result = await revokeRemovedComponentApiKeys({
      client: client as never,
      logger: { error: jest.fn() } as never,
      isSecurityEnabled: true,
      previousUnit: unit([], [{ id: 'dest-gone' }]),
      nextUnit: unit([], []),
    });

    expect(result).toEqual({ apiKeysMayRemain: true });
  });

  it('logs instead of throwing when the key lookup fails', async () => {
    const { client, queryApiKeys, invalidateApiKey } = createClient();
    queryApiKeys.mockRejectedValue(new Error('boom'));
    const logger = { error: jest.fn() };

    const result = await revokeRemovedComponentApiKeys({
      client: client as never,
      logger: logger as never,
      isSecurityEnabled: true,
      previousUnit: unit([], [{ id: 'dest-gone' }]),
      nextUnit: unit([], []),
    });

    expect(result).toEqual({ apiKeysMayRemain: true });
    expect(invalidateApiKey).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('does not invalidate when every source and destination is still present', async () => {
    const { client, hasPrivileges, invalidateApiKey } = createClient();

    const result = await revokeRemovedComponentApiKeys({
      client: client as never,
      logger: { error: jest.fn() } as never,
      isSecurityEnabled: true,
      previousUnit: unit([{ id: 'src-1' }], [{ id: 'dest-1' }]),
      nextUnit: unit([{ id: 'src-1' }], [{ id: 'dest-1' }]),
    });

    expect(result).toEqual({ apiKeysMayRemain: false });
    expect(hasPrivileges).not.toHaveBeenCalled();
    expect(invalidateApiKey).not.toHaveBeenCalled();
  });
});
