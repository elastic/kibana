/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';

import { IndicesAPIClient } from './indices_api_client';

describe('getFields', () => {
  it('queries for available fields', async () => {
    const { http } = coreMock.createSetup();
    http.get.mockResolvedValue(['foo']);

    const client = new IndicesAPIClient(http);

    const fields = await client.getFields('foo with special characters-&-*');

    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith(
      `/internal/security/fields/${encodeURIComponent('foo with special characters-&-*')}`
    );
    expect(fields).toEqual(['foo']);
  });

  it('caches results for matching patterns', async () => {
    const { http } = coreMock.createSetup();
    http.get.mockResolvedValue(['foo']);

    const client = new IndicesAPIClient(http);

    const fields = await client.getFields('foo');

    const fields2 = await client.getFields('foo');

    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith(`/internal/security/fields/${encodeURIComponent('foo')}`);

    expect(fields).toEqual(['foo']);
    expect(fields2).toEqual(['foo']);
  });

  it('does not cache results for differing patterns', async () => {
    const { http } = coreMock.createSetup();
    http.get.mockResolvedValueOnce(['foo']);
    http.get.mockResolvedValueOnce(['bar']);

    const client = new IndicesAPIClient(http);

    const fields = await client.getFields('foo');

    const fields2 = await client.getFields('bar');

    expect(http.get).toHaveBeenCalledTimes(2);
    expect(http.get).toHaveBeenNthCalledWith(
      1,
      `/internal/security/fields/${encodeURIComponent('foo')}`
    );
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      `/internal/security/fields/${encodeURIComponent('bar')}`
    );

    expect(fields).toEqual(['foo']);
    expect(fields2).toEqual(['bar']);
  });

  it('does not cache empty results', async () => {
    const { http } = coreMock.createSetup();
    http.get.mockResolvedValue([]);

    const client = new IndicesAPIClient(http);

    const fields = await client.getFields('foo');

    const fields2 = await client.getFields('foo');

    expect(http.get).toHaveBeenCalledTimes(2);
    expect(http.get).toHaveBeenNthCalledWith(
      1,
      `/internal/security/fields/${encodeURIComponent('foo')}`
    );
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      `/internal/security/fields/${encodeURIComponent('foo')}`
    );

    expect(fields).toEqual([]);
    expect(fields2).toEqual([]);
  });

  it('throws unexpected errors', async () => {
    const { http } = coreMock.createSetup();
    http.get.mockRejectedValue(new Error('AHHHH'));

    const client = new IndicesAPIClient(http);

    await expect(() => client.getFields('foo')).rejects.toThrowErrorMatchingInlineSnapshot(
      `"AHHHH"`
    );
  });
});
