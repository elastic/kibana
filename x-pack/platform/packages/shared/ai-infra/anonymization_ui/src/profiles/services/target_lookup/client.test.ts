/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTargetLookupClient } from './client';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

describe('createTargetLookupClient', () => {
  const createClient = (fetch: jest.Mock) =>
    createTargetLookupClient({
      fetch: fetch as unknown as Parameters<typeof createTargetLookupClient>[0]['fetch'],
    });

  it('fetches data views list', async () => {
    const fetch = jest.fn().mockResolvedValue({
      data_view: [{ id: 'logs', title: 'logs-*', name: 'Logs' }],
    });

    const client = createClient(fetch);
    const result = await client.getDataViews();

    expect(fetch).toHaveBeenCalledWith('/api/data_views');
    expect(result.data_view?.[0].title).toBe('logs-*');
  });

  it('fetches data view by encoded id', async () => {
    const fetch = jest.fn().mockResolvedValue({
      data_view: { title: 'logs-*' },
    });

    const client = createClient(fetch);
    const result = await client.getDataViewById('logs/*');

    expect(fetch).toHaveBeenCalledWith('/api/data_views/data_view/logs%2F*');
    expect(result.data_view?.title).toBe('logs-*');
  });

  it('resolves matching indices with expand wildcards query', async () => {
    const fetch = jest.fn().mockResolvedValue({
      data_streams: [{ name: 'logs-apm-default' }],
      aliases: [{ name: 'logs-alias' }],
      indices: [{ name: 'logs-2026.02.16' }],
    });

    const client = createClient(fetch);
    const result = await client.resolveIndex('logs*');

    expect(fetch).toHaveBeenCalledWith('/internal/index-pattern-management/resolve_index/logs*', {
      query: { expand_wildcards: 'all' },
    });
    expect(result.indices?.[0].name).toBe('logs-2026.02.16');
  });

  it('treats resolve-index 404 as no matches', async () => {
    const fetch = jest.fn().mockRejectedValue({
      statusCode: 404,
      error: 'Not Found',
      message: 'no such index [te]',
    });

    const client = createClient(fetch);

    await expect(client.resolveIndex('te')).resolves.toEqual({
      data_streams: [],
      aliases: [],
      indices: [],
    });
  });

  it('rethrows non-object resolve-index errors', async () => {
    const fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const client = createClient(fetch);

    await expect(client.resolveIndex('te')).rejects.toThrow('network down');
  });

  it('rethrows non-404 resolve-index errors', async () => {
    const fetch = jest.fn().mockRejectedValue({
      statusCode: 500,
      message: 'unexpected failure',
    });

    const client = createClient(fetch);

    await expect(client.resolveIndex('te')).rejects.toMatchObject({
      statusCode: 500,
      message: 'unexpected failure',
    });
  });

  it('fetches fields for wildcard with version header', async () => {
    const fetch = jest.fn().mockResolvedValue({
      fields: [{ name: 'message', metadata_field: false }],
    });

    const client = createClient(fetch);
    const result = await client.getFieldsForWildcard('logs-*');

    expect(fetch).toHaveBeenCalledWith('/internal/data_views/_fields_for_wildcard', {
      version: '1',
      headers: {
        [ELASTIC_HTTP_VERSION_HEADER]: '1',
      },
      query: {
        pattern: 'logs-*',
      },
    });
    expect(result.fields?.[0].name).toBe('message');
  });
});
