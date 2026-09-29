/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';
import { createUseCloudConnectStatusHook } from './use_cloud_connect_status';
import type { ClusterDetails } from '../types';

describe('useCloudConnectStatus', () => {
  const createMockHttp = (mockGet: jest.Mock): HttpSetup =>
    ({
      get: mockGet,
    } as unknown as HttpSetup);

  const createMockClusterDetails = (overrides: Partial<ClusterDetails> = {}): ClusterDetails => ({
    id: 'cluster-123',
    name: 'Test Cluster',
    metadata: {
      created_at: '2024-01-01T00:00:00Z',
      created_by: 'user@example.com',
      organization_id: 'org-456',
    },
    self_managed_cluster: {
      id: 'es-cluster-789',
      name: 'ES Cluster',
      version: '8.15.0',
    },
    license: {
      type: 'trial',
      uid: 'license-uid-123',
    },
    services: {
      eis: { enabled: false },
      auto_ops: { enabled: false },
    },
    ...overrides,
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading state initially', () => {
    const mockGet = jest.fn().mockReturnValue(new Promise(() => {})); // Never resolves
    const http = createMockHttp(mockGet);
    const useCloudConnectStatus = createUseCloudConnectStatusHook({ http });

    const { result } = renderHook(() => useCloudConnectStatus());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isCloudConnected).toBe(false);
    expect(result.current.isCloudConnectEisEnabled).toBe(false);
    expect(result.current.isCloudConnectAutoopsEnabled).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return connected status when API call succeeds', async () => {
    const clusterDetails = createMockClusterDetails({
      services: {
        eis: { enabled: true },
        auto_ops: { enabled: false },
      },
    });
    const mockGet = jest.fn().mockResolvedValue(clusterDetails);
    const http = createMockHttp(mockGet);
    const useCloudConnectStatus = createUseCloudConnectStatusHook({ http });

    const { result } = renderHook(() => useCloudConnectStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isCloudConnected).toBe(true);
    expect(result.current.isCloudConnectEisEnabled).toBe(true);
    expect(result.current.isCloudConnectAutoopsEnabled).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should expose autoOpsServiceUrl and autoOpsDocsUrl when AutoOps metadata is present', async () => {
    const clusterDetails = createMockClusterDetails({
      services: {
        auto_ops: {
          enabled: true,
          metadata: {
            service_url: 'https://cloud.elastic.co/performance/abc123',
            documentation_url: 'https://www.elastic.co/docs/current/en/autoops',
          },
        },
      },
    });
    const mockGet = jest.fn().mockResolvedValue(clusterDetails);
    const http = createMockHttp(mockGet);
    const useCloudConnectStatus = createUseCloudConnectStatusHook({ http });

    const { result } = renderHook(() => useCloudConnectStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isCloudConnectAutoopsEnabled).toBe(true);
    expect(result.current.autoOpsServiceUrl).toBe('https://cloud.elastic.co/performance/abc123');
    expect(result.current.autoOpsDocsUrl).toBe('https://www.elastic.co/docs/current/en/autoops');
  });

  it('should rewrite autoOpsServiceUrl to a deployment-scoped URL when deploymentId is provided', async () => {
    const clusterDetails = createMockClusterDetails({
      services: {
        auto_ops: {
          enabled: true,
          metadata: {
            service_url:
              'https://app.auto-ops.cloud.elastic.co/regions/aws-us-east-1/organizations/198583657190/clusters/abcdef1234567890abcdef1234567890/cluster',
            documentation_url: 'https://www.elastic.co/docs/current/en/autoops',
          },
        },
      },
    });
    const mockGet = jest.fn().mockResolvedValue(clusterDetails);
    const http = createMockHttp(mockGet);
    const useCloudConnectStatus = createUseCloudConnectStatusHook({
      http,
      deploymentId: 'ed211902155ba60ebf36df819054704e',
    });

    const { result } = renderHook(() => useCloudConnectStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.autoOpsServiceUrl).toBe(
      'https://app.auto-ops.cloud.elastic.co/regions/aws-us-east-1/organizations/198583657190/deployments/ed211902155ba60ebf36df819054704e/deployment'
    );
    // docs url is unaffected
    expect(result.current.autoOpsDocsUrl).toBe('https://www.elastic.co/docs/current/en/autoops');
  });

  it('should return undefined autoOpsServiceUrl and autoOpsDocsUrl when AutoOps metadata is absent', async () => {
    const clusterDetails = createMockClusterDetails({
      services: {
        auto_ops: { enabled: true },
      },
    });
    const mockGet = jest.fn().mockResolvedValue(clusterDetails);
    const http = createMockHttp(mockGet);
    const useCloudConnectStatus = createUseCloudConnectStatusHook({ http });

    const { result } = renderHook(() => useCloudConnectStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isCloudConnectAutoopsEnabled).toBe(true);
    expect(result.current.autoOpsServiceUrl).toBeUndefined();
    expect(result.current.autoOpsDocsUrl).toBeUndefined();
  });

  it('should return error state on errors', async () => {
    const error500 = new Error('Internal server error');
    (error500 as any).response = { status: 500 };
    const mockGet = jest.fn().mockRejectedValue(error500);
    const http = createMockHttp(mockGet);
    const useCloudConnectStatus = createUseCloudConnectStatusHook({ http });

    const { result } = renderHook(() => useCloudConnectStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isCloudConnected).toBe(false);
    expect(result.current.isCloudConnectEisEnabled).toBe(false);
    expect(result.current.isCloudConnectAutoopsEnabled).toBe(false);
    expect(result.current.error).toEqual(error500);
  });
});
