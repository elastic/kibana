/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTargetLookupClient } from './client';

describe('createTargetLookupClient', () => {
  it('returns empty resolveIndex response on top-level 404', async () => {
    const fetch = jest.fn().mockRejectedValue({ statusCode: 404 });
    const client = createTargetLookupClient({ fetch });

    await expect(client.resolveIndex('logs-*')).resolves.toEqual({
      data_streams: [],
      aliases: [],
      indices: [],
    });
  });

  it('returns empty resolveIndex response on meta statusCode 404', async () => {
    const fetch = jest.fn().mockRejectedValue({ meta: { statusCode: 404 } });
    const client = createTargetLookupClient({ fetch });

    await expect(client.resolveIndex('logs-*')).resolves.toEqual({
      data_streams: [],
      aliases: [],
      indices: [],
    });
  });

  it('returns empty resolveIndex response on response.status 404', async () => {
    const fetch = jest.fn().mockRejectedValue({ response: { status: 404 } });
    const client = createTargetLookupClient({ fetch });

    await expect(client.resolveIndex('logs-*')).resolves.toEqual({
      data_streams: [],
      aliases: [],
      indices: [],
    });
  });

  it('rethrows non-404 resolveIndex errors', async () => {
    const error = { statusCode: 500, body: { message: 'boom' } };
    const fetch = jest.fn().mockRejectedValue(error);
    const client = createTargetLookupClient({ fetch });

    await expect(client.resolveIndex('logs-*')).rejects.toBe(error);
  });
});
