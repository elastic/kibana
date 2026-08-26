/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { fetchTakenPackageNames } from './package_names';

const mockGetInstalledPackages = jest.fn();
const mockGetAllIntegrations = jest.fn();

jest.mock('./api', () => ({
  getInstalledPackages: (...args: unknown[]) => mockGetInstalledPackages(...args),
  getAllIntegrations: (...args: unknown[]) => mockGetAllIntegrations(...args),
}));

const mockHttp = {} as HttpSetup;
const deps = { http: mockHttp };

describe('fetchTakenPackageNames', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInstalledPackages.mockResolvedValue({ items: [] });
    mockGetAllIntegrations.mockResolvedValue([]);
  });

  it('includes installed Fleet package IDs', async () => {
    mockGetInstalledPackages.mockResolvedValue({
      items: [{ id: 'nginx' }, { id: 'system' }, { id: 'apache' }],
    });

    const result = await fetchTakenPackageNames(deps);

    expect(result.has('nginx')).toBe(true);
    expect(result.has('system')).toBe(true);
    expect(result.has('apache')).toBe(true);
  });

  it('includes AIV2 integration IDs', async () => {
    mockGetAllIntegrations.mockResolvedValue([
      { integrationId: 'my_custom_integration', title: 'My Custom Integration' },
    ]);

    const result = await fetchTakenPackageNames(deps);

    expect(result.has('my_custom_integration')).toBe(true);
  });

  it('includes normalized AIV2 integration titles', async () => {
    mockGetAllIntegrations.mockResolvedValue([{ integrationId: 'some_id', title: 'Nginx Logs' }]);

    const result = await fetchTakenPackageNames(deps);

    expect(result.has('nginx_logs')).toBe(true);
  });

  it('handles empty responses without throwing', async () => {
    mockGetInstalledPackages.mockResolvedValue({ items: [] });
    mockGetAllIntegrations.mockResolvedValue([]);

    const result = await fetchTakenPackageNames(deps);

    expect(result.size).toBe(0);
  });

  it('handles null/undefined responses without throwing', async () => {
    mockGetInstalledPackages.mockResolvedValue(null);
    mockGetAllIntegrations.mockResolvedValue(null);

    const result = await fetchTakenPackageNames(deps);

    expect(result.size).toBe(0);
  });

  it('combines Fleet packages and AIV2 integrations into one set', async () => {
    mockGetInstalledPackages.mockResolvedValue({
      items: [{ id: 'nginx' }],
    });
    mockGetAllIntegrations.mockResolvedValue([{ integrationId: 'my_logs', title: 'My Logs' }]);

    const result = await fetchTakenPackageNames(deps);

    expect(result.has('nginx')).toBe(true);
    expect(result.has('my_logs')).toBe(true);
    expect(result.has('my_logs')).toBe(true);
  });

  it('passes deps through to both API calls', async () => {
    const abortSignal = new AbortController().signal;
    await fetchTakenPackageNames({ http: mockHttp, abortSignal });

    expect(mockGetInstalledPackages).toHaveBeenCalledWith({ http: mockHttp, abortSignal });
    expect(mockGetAllIntegrations).toHaveBeenCalledWith({ http: mockHttp, abortSignal });
  });
});
