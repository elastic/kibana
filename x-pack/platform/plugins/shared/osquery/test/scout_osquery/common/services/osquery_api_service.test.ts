/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/scout', () => ({
  measurePerformanceAsync: jest.fn((_log: unknown, _label: unknown, fn: () => Promise<unknown>) =>
    fn()
  ),
}));

import { getOsqueryApiService } from './osquery_api_service';

const makeClient = () => {
  const calls: Array<{ method: string; path: string }> = [];
  const request = jest.fn(async (opts: { method: string; path: string }) => {
    calls.push({ method: opts.method, path: opts.path });

    return { data: {} };
  });

  return {
    client: { request } as unknown as Parameters<typeof getOsqueryApiService>[0]['kbnClient'],
    calls,
  };
};

const log = {} as any;

describe('getOsqueryApiService — path-prefix logic', () => {
  it('uses /api/osquery/... paths when no spaceId is set', async () => {
    const { client, calls } = makeClient();
    const svc = getOsqueryApiService({ kbnClient: client, log });
    await svc.packs.list();
    expect(calls[0].path).toBe('/api/osquery/packs');
  });

  it('prefixes all paths with /s/{spaceId} when spaceId is set', async () => {
    const { client, calls } = makeClient();
    const svc = getOsqueryApiService({ kbnClient: client, log, spaceId: 'foo' });
    await svc.packs.list();
    await svc.savedQueries.list();
    await svc.liveQueries.create({ query: 'select 1' });
    expect(calls[0].path).toBe('/s/foo/api/osquery/packs');
    expect(calls[1].path).toBe('/s/foo/api/osquery/saved_queries');
    expect(calls[2].path).toBe('/s/foo/api/osquery/live_queries');
  });

  it('per-call spaceOverride takes precedence over service-level spaceId', async () => {
    const { client, calls } = makeClient();
    const svc = getOsqueryApiService({ kbnClient: client, log, spaceId: 'foo' });
    await svc.packs.create({ name: 'test' }, 'bar');
    expect(calls[0].path).toBe('/s/bar/api/osquery/packs');
  });
});
