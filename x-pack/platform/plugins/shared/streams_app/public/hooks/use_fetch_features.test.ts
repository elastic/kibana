/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useFetchFeatures, type FeatureWithStream } from './use_fetch_features';
import { useKibana } from './use_kibana';
import { useFetchErrorToast } from './use_fetch_error_toast';

jest.mock('./use_kibana');
jest.mock('./use_fetch_error_toast');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseFetchErrorToast = useFetchErrorToast as jest.MockedFunction<typeof useFetchErrorToast>;

const mockStreamsRepositoryClient = {
  fetch: jest.fn(),
};

function createMockFeatureWithStream(
  overrides: Partial<FeatureWithStream> = {}
): FeatureWithStream {
  return {
    id: 'feature-123',
    type: 'service',
    name: 'test-feature',
    description: 'A test feature',
    value: { key: 'value' },
    confidence: 80,
    evidence: [],
    tags: [],
    meta: {},
    status: 'active',
    last_seen: '2025-01-01T00:00:00Z',
    stream_name: 'logs',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  mockUseFetchErrorToast.mockReturnValue(jest.fn());

  mockUseKibana.mockReturnValue({
    dependencies: {
      start: {
        streams: {
          streamsRepositoryClient: mockStreamsRepositoryClient,
        },
      },
    },
  } as unknown as ReturnType<typeof useKibana>);
});

describe('useFetchFeatures', () => {
  it('fetches features from the API', async () => {
    const mockFeatures = [
      createMockFeatureWithStream({ id: 'feature-1', name: 'Feature 1' }),
      createMockFeatureWithStream({ id: 'feature-2', name: 'Feature 2' }),
    ];

    mockStreamsRepositoryClient.fetch.mockResolvedValue({
      features: mockFeatures,
    });

    const { result } = renderHook(() => useFetchFeatures());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.features).toHaveLength(2);
    expect(result.current.data?.features[0].name).toBe('Feature 1');
    expect(mockStreamsRepositoryClient.fetch).toHaveBeenCalledWith(
      'GET /internal/streams/_features',
      expect.objectContaining({
        params: {
          query: {
            streamNames: undefined,
            type: undefined,
          },
        },
      })
    );
  });

  it('passes streamNames filter to API', async () => {
    mockStreamsRepositoryClient.fetch.mockResolvedValue({
      features: [],
    });

    const { result } = renderHook(() =>
      useFetchFeatures({ streamNames: ['logs', 'metrics'] })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockStreamsRepositoryClient.fetch).toHaveBeenCalledWith(
      'GET /internal/streams/_features',
      expect.objectContaining({
        params: {
          query: {
            streamNames: ['logs', 'metrics'],
            type: undefined,
          },
        },
      })
    );
  });

  it('passes type filter to API', async () => {
    mockStreamsRepositoryClient.fetch.mockResolvedValue({
      features: [],
    });

    const { result } = renderHook(() => useFetchFeatures({ type: 'service' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockStreamsRepositoryClient.fetch).toHaveBeenCalledWith(
      'GET /internal/streams/_features',
      expect.objectContaining({
        params: {
          query: {
            streamNames: undefined,
            type: 'service',
          },
        },
      })
    );
  });

  it('filters features by query on client side', async () => {
    const mockFeatures = [
      createMockFeatureWithStream({ id: 'feature-1', name: 'auth-service', title: 'Auth Service' }),
      createMockFeatureWithStream({
        id: 'feature-2',
        name: 'payment-service',
        title: 'Payment Service',
      }),
      createMockFeatureWithStream({ id: 'feature-3', name: 'user-service', title: 'User Service' }),
    ];

    mockStreamsRepositoryClient.fetch.mockResolvedValue({
      features: mockFeatures,
    });

    const { result } = renderHook(() => useFetchFeatures({ query: 'auth' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.features).toHaveLength(1);
    expect(result.current.data?.features[0].name).toBe('auth-service');
  });

  it('filters features by query case-insensitively', async () => {
    const mockFeatures = [
      createMockFeatureWithStream({ id: 'feature-1', name: 'AUTH-SERVICE' }),
      createMockFeatureWithStream({ id: 'feature-2', name: 'other-service' }),
    ];

    mockStreamsRepositoryClient.fetch.mockResolvedValue({
      features: mockFeatures,
    });

    const { result } = renderHook(() => useFetchFeatures({ query: 'auth' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.features).toHaveLength(1);
    expect(result.current.data?.features[0].name).toBe('AUTH-SERVICE');
  });

  it('filters features by stream_name in query', async () => {
    const mockFeatures = [
      createMockFeatureWithStream({ id: 'feature-1', name: 'service-a', stream_name: 'logs' }),
      createMockFeatureWithStream({ id: 'feature-2', name: 'service-b', stream_name: 'metrics' }),
    ];

    mockStreamsRepositoryClient.fetch.mockResolvedValue({
      features: mockFeatures,
    });

    const { result } = renderHook(() => useFetchFeatures({ query: 'logs' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.features).toHaveLength(1);
    expect(result.current.data?.features[0].stream_name).toBe('logs');
  });

  it('returns all features when query is empty', async () => {
    const mockFeatures = [
      createMockFeatureWithStream({ id: 'feature-1' }),
      createMockFeatureWithStream({ id: 'feature-2' }),
    ];

    mockStreamsRepositoryClient.fetch.mockResolvedValue({
      features: mockFeatures,
    });

    const { result } = renderHook(() => useFetchFeatures({ query: '  ' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.features).toHaveLength(2);
  });
});
