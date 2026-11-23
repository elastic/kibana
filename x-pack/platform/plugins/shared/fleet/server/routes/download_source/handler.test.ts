/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { downloadSourceService } from '../../services/download_source';

import { getDownloadSourcesHandler, getOneDownloadSourcesHandler } from './handler';

describe('download source handlers', () => {
  const mockResponse = {
    ok: jest.fn().mockImplementation((options) => options),
    notFound: jest.fn().mockImplementation((options) => options),
  };

  const downloadSource = {
    id: 'source',
    name: 'Source',
    host: 'https://artifacts.example.com',
    is_default: false,
    ssl: { certificate: 'cert', key: 'ssl-key' },
    auth: {
      username: 'user',
      password: 'password',
      headers: [{ key: 'X-Custom', value: 'header-value' }],
    },
  };
  const sanitizedDownloadSource = {
    id: 'source',
    name: 'Source',
    host: 'https://artifacts.example.com',
    is_default: false,
    ssl: { certificate: 'cert' },
    auth: { username: 'user' },
  };

  const contextWithAuthz = (readSettings: boolean) =>
    ({
      fleet: Promise.resolve({ authz: { fleet: { readSettings } } }),
    } as any);

  beforeEach(() => {
    jest.spyOn(downloadSourceService, 'list').mockResolvedValue({
      items: [downloadSource],
      page: 1,
      perPage: 1,
      total: 1,
    } as any);
    jest.spyOn(downloadSourceService, 'get').mockResolvedValue(downloadSource as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns full download sources to users who can read settings', async () => {
    const listRes = await getDownloadSourcesHandler(
      contextWithAuthz(true),
      {} as any,
      mockResponse as any
    );
    const getRes = await getOneDownloadSourcesHandler(
      contextWithAuthz(true),
      { params: { sourceId: 'source' } } as any,
      mockResponse as any
    );

    expect((listRes as any).body.items).toEqual([downloadSource]);
    expect((getRes as any).body.item).toEqual(downloadSource);
  });

  it('returns sanitized download sources to users who cannot read settings', async () => {
    const listRes = await getDownloadSourcesHandler(
      contextWithAuthz(false),
      {} as any,
      mockResponse as any
    );
    const getRes = await getOneDownloadSourcesHandler(
      contextWithAuthz(false),
      { params: { sourceId: 'source' } } as any,
      mockResponse as any
    );

    expect((listRes as any).body.items).toEqual([sanitizedDownloadSource]);
    expect((getRes as any).body.item).toEqual(sanitizedDownloadSource);
  });
});
