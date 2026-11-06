/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceApiKeyServicesDeps } from './source_api_keys';
import { createSourceApiKeyServices } from './source_api_keys';

const createDeps = (canManage?: boolean) => {
  const fetch = jest.fn();
  const deps = {
    streamsRepositoryClient: { fetch },
    canManage,
  } as unknown as SourceApiKeyServicesDeps;
  return { deps, fetch };
};

describe('createSourceApiKeyServices', () => {
  it('neither lists keys nor checks privileges without V2 manage', async () => {
    const { deps, fetch } = createDeps(false);
    const services = createSourceApiKeyServices(deps);

    await expect(services.load('otlp-input')).resolves.toEqual([]);
    await expect(services.checkPrivileges({ id: 'otlp-input', type: 'otlp' })).resolves.toEqual({
      canCreate: false,
      failure: 'none',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lists keys from the API by default', async () => {
    const { deps, fetch } = createDeps();
    const apiKeys = [{ id: 'key-1', name: 'stream-source-otlp-input', createdAt: 'now' }];
    fetch.mockResolvedValue({ apiKeys });

    await expect(createSourceApiKeyServices(deps).load('otlp-input')).resolves.toEqual(apiKeys);
    expect(fetch).toHaveBeenCalledWith('GET /internal/streams/sources/api_keys', {
      params: { query: { sourceId: 'otlp-input', unitId: 'default' } },
      signal: null,
    });
  });
});
