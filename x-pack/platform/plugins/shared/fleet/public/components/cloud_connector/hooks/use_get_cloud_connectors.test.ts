/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { CLOUD_CONNECTOR_API_ROUTES } from '../../../constants';

import { useGetCloudConnectors } from './use_get_cloud_connectors';

jest.mock('@kbn/kibana-react-plugin/public');

const mockHttp = {
  get: jest.fn(),
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const connector = (id: string, packagePolicyCount: number) => ({
  id,
  name: `connector-${id}`,
  cloudProvider: 'aws',
  packagePolicyCount,
});

const usageItem = (packageName: string) => ({
  id: `policy-of-${packageName}`,
  name: `policy-of-${packageName}`,
  package: { name: packageName, title: packageName, version: '1.0.0' },
  policy_ids: ['agent-policy-1'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

/**
 * Routes http.get by path: the list endpoint returns `connectors`, the usage endpoint
 * returns the usage items registered per connector id.
 */
const mockApi = (
  connectors: Array<ReturnType<typeof connector>>,
  usageByConnectorId: Record<string, Array<ReturnType<typeof usageItem>>>
) => {
  mockHttp.get.mockImplementation((path: string) => {
    if (path === CLOUD_CONNECTOR_API_ROUTES.LIST_PATTERN) {
      return Promise.resolve({ items: connectors });
    }
    const match = Object.keys(usageByConnectorId).find((id) => path.includes(id));
    if (match) {
      const items = usageByConnectorId[match];
      return Promise.resolve({ items, total: items.length, page: 1, perPage: 1000 });
    }
    return Promise.reject(new Error(`unexpected path: ${path}`));
  });
};

describe('useGetCloudConnectors', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockUseKibana.mockReturnValue({
      services: { http: mockHttp },
    } as unknown as ReturnType<typeof useKibana>);
    mockHttp.get.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
    jest.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('returns all connectors unfiltered when there is no requesting-integration context', async () => {
    mockApi([connector('c1', 1), connector('c2', 1)], {});

    // No packageName: listing context (e.g. connector management UI)
    const { result } = renderHook(() => useGetCloudConnectors({ cloudProvider: 'aws' }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((c) => c.id)).toEqual(['c1', 'c2']);
    // Usage endpoint must not be called — no group filtering happens
    expect(mockHttp.get).toHaveBeenCalledTimes(1);
  });

  it('returns all connectors unfiltered when cloudProvider is missing', async () => {
    mockApi([connector('c1', 1)], {});

    const { result } = renderHook(() => useGetCloudConnectors({ packageName: 'aws' }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((c) => c.id)).toEqual(['c1']);
    expect(mockHttp.get).toHaveBeenCalledTimes(1);
  });

  it('shows same-group connectors to a provider-default integration', async () => {
    mockApi([connector('c1', 1)], { c1: [usageItem('aws')] });

    const { result } = renderHook(
      () => useGetCloudConnectors({ cloudProvider: 'aws', packageName: 'aws_securityhub' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((c) => c.id)).toEqual(['c1']);
  });

  it('hides isolated-group connectors from a provider-default integration', async () => {
    mockApi([connector('cspm-connector', 1), connector('aws-connector', 1)], {
      'cspm-connector': [usageItem('cloud_security_posture')],
      'aws-connector': [usageItem('aws')],
    });

    const { result } = renderHook(
      () => useGetCloudConnectors({ cloudProvider: 'aws', packageName: 'aws_securityhub' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((c) => c.id)).toEqual(['aws-connector']);
  });

  it('hides provider-default connectors from an isolated-group integration', async () => {
    mockApi([connector('cspm-connector', 1), connector('aws-connector', 1)], {
      'cspm-connector': [usageItem('cloud_asset_inventory')],
      'aws-connector': [usageItem('aws')],
    });

    const { result } = renderHook(
      () => useGetCloudConnectors({ cloudProvider: 'aws', packageName: 'cloud_security_posture' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((c) => c.id)).toEqual(['cspm-connector']);
  });

  it('shows connectors with no linked policies to any group (adoptable)', async () => {
    mockApi([connector('unattached', 0)], {});

    const { result } = renderHook(
      () => useGetCloudConnectors({ cloudProvider: 'aws', packageName: 'cloud_security_posture' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((c) => c.id)).toEqual(['unattached']);
  });

  it('hides mixed-group connectors from both groups (every-usage check)', async () => {
    // Pre-enforcement data can contain a connector attached in both groups
    const usage = {
      mixed: [usageItem('cloud_security_posture'), usageItem('aws')],
    };
    mockApi([connector('mixed', 2)], usage);

    const forDefault = renderHook(
      () => useGetCloudConnectors({ cloudProvider: 'aws', packageName: 'aws_securityhub' }),
      { wrapper }
    );
    await waitFor(() => expect(forDefault.result.current.isSuccess).toBe(true));
    expect(forDefault.result.current.data).toEqual([]);

    queryClient.clear();
    const forIsolated = renderHook(
      () => useGetCloudConnectors({ cloudProvider: 'aws', packageName: 'cloud_security_posture' }),
      { wrapper }
    );
    await waitFor(() => expect(forIsolated.result.current.isSuccess).toBe(true));
    expect(forIsolated.result.current.data).toEqual([]);
  });

  it('treats connectors as compatible when the usage lookup fails (not silently hidden)', async () => {
    mockHttp.get.mockImplementation((path: string) => {
      if (path === CLOUD_CONNECTOR_API_ROUTES.LIST_PATTERN) {
        return Promise.resolve({ items: [connector('c1', 1)] });
      }
      return Promise.reject(new Error('usage endpoint down'));
    });

    const { result } = renderHook(
      () => useGetCloudConnectors({ cloudProvider: 'aws', packageName: 'aws_securityhub' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((c) => c.id)).toEqual(['c1']);
  });
});
