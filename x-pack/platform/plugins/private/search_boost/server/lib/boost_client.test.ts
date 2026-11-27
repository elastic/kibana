/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getBoostProfiles, getBoostRules } from './boost_client';

describe('boost client', () => {
  it('lists the profiles, with `prewarm` and `pinned` as booleans', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient();
    const dataStreamsProfile = {
      name: 'recent',
      type: 'data_streams',
      is_builtin: false,
      recent: { min_boost: 1, max_boost: 5, max_age: '1d' },
      standard: { min_boost: 1, max_boost: 2, max_age: '7d' },
      background: { min_boost: 1, max_boost: 1 },
    };
    client.transport.request.mockResolvedValue({
      fast: {
        name: 'fast',
        type: 'indices',
        is_builtin: false,
        min_boost: 1,
        max_boost: 5,
        availability: 'base',
        prewarm: 'true',
        pinned: 'false',
      },
      recent: dataStreamsProfile,
    });

    expect(await getBoostProfiles(client)).toEqual([
      {
        name: 'fast',
        type: 'indices',
        is_builtin: false,
        min_boost: 1,
        max_boost: 5,
        availability: 'base',
        prewarm: true,
        pinned: false,
      },
      dataStreamsProfile,
    ]);
    expect(client.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/_boost/profile',
    });
  });

  it('keeps `prewarm` and `pinned` when Elasticsearch already returns booleans', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient();
    const profile = {
      name: 'fast',
      type: 'indices',
      is_builtin: false,
      min_boost: 1,
      max_boost: 5,
      availability: 'base',
      prewarm: false,
      pinned: true,
    };
    client.transport.request.mockResolvedValue({ fast: profile });

    expect(await getBoostProfiles(client)).toEqual([profile]);
  });

  it('lists the rules', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient();
    const rule = {
      name: 'logs',
      index_pattern: 'logs-*',
      boost_profile: 'recent',
      priority: 0,
      is_builtin: false,
    };
    client.transport.request.mockResolvedValue({ logs: rule });

    expect(await getBoostRules(client)).toEqual([rule]);
    expect(client.transport.request).toHaveBeenCalledWith({ method: 'GET', path: '/_boost/rule' });
  });
});
