/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider, QueryClient } from '@kbn/react-query';
import { useKibana } from '../lib/kibana';
import { useEcsSchema } from './use_ecs_schema';
import { ECS_SCHEMA_API_ROUTE } from '../../../common/constants';

jest.mock('../lib/kibana');

// Mock the fallback JSON so tests are deterministic and don't read from disk.
// Path must match `v${FALLBACK_ECS_VERSION}.json` from common/constants.
jest.mock('../schemas/ecs/v9.2.0.json', () => [
  {
    field: '@timestamp',
    type: 'date',
    normalization: 'set',
    example: '2015-01-01T00:00:00.000Z',
    description: 'Date/time when the event originated.',
  },
  {
    field: 'host.name',
    type: 'keyword',
    normalization: 'set',
    example: 'beatbox',
    description: 'Name of the host.',
  },
]);

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return Wrapper;
};

const createFreshQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: () => null, warn: () => null, error: () => null },
  });

const MOCK_ECS_FIELDS = [
  {
    field: 'event.action',
    type: 'keyword',
    normalization: 'set',
    example: 'user-login',
    description: 'The action captured by the event.',
  },
  {
    field: 'host.name',
    type: 'keyword',
    normalization: 'set',
    example: 'beatbox',
    description: 'Name of the host.',
  },
];

const MOCK_API_RESPONSE = {
  version: '9.3.0',
  data: MOCK_ECS_FIELDS,
};

describe('useEcsSchema', () => {
  let mockHttp: { get: jest.Mock };
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttp = { get: jest.fn().mockResolvedValue(MOCK_API_RESPONSE) };
    queryClient = createFreshQueryClient();

    useKibanaMock.mockReturnValue({
      services: { http: mockHttp },
    } as unknown as ReturnType<typeof useKibana>);
  });

  describe('successful loading', () => {
    it('should return ECS field data from the API response', async () => {
      const { result } = renderHook(() => useEcsSchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(MOCK_ECS_FIELDS);
      expect(result.current.isError).toBe(false);
    });

    it('should call the correct internal API endpoint with version header', async () => {
      const { result } = renderHook(() => useEcsSchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockHttp.get).toHaveBeenCalledWith(ECS_SCHEMA_API_ROUTE, {
        version: '1',
      });
    });

    it('should preserve the original field order returned by the API', async () => {
      const { result } = renderHook(() => useEcsSchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data?.[0].field).toBe('event.action');
      expect(result.current.data?.[1].field).toBe('host.name');
    });
  });

  describe('loading state', () => {
    it('should return isLoading: true while the API request is in-flight', () => {
      // Never resolve so the hook stays in loading state
      mockHttp.get.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useEcsSchema(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('error with fallback', () => {
    it('should fall back to bundled JSON when the API call fails', async () => {
      mockHttp.get.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEcsSchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Fallback JSON mock contains two fields
      expect(result.current.data).toEqual([
        {
          field: '@timestamp',
          type: 'date',
          normalization: 'set',
          example: '2015-01-01T00:00:00.000Z',
          description: 'Date/time when the event originated.',
        },
        {
          field: 'host.name',
          type: 'keyword',
          normalization: 'set',
          example: 'beatbox',
          description: 'Name of the host.',
        },
      ]);
    });

    it('should set isError: true when the API fails', async () => {
      mockHttp.get.mockRejectedValue(new Error('500 Internal Server Error'));

      const { result } = renderHook(() => useEcsSchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should return isError: false on successful load', async () => {
      const { result } = renderHook(() => useEcsSchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isError).toBe(false);
    });
  });

  describe('staleTime: Infinity caching', () => {
    it('should only make one HTTP request when the hook is rendered twice in the same client', async () => {
      const { result: result1 } = renderHook(() => useEcsSchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result1.current.isLoading).toBe(false));

      // Second render with the SAME queryClient — result is cached, no new request
      const { result: result2 } = renderHook(() => useEcsSchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result2.current.isLoading).toBe(false));

      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });

    it('should make a new HTTP request when a fresh query client is used', async () => {
      const { result: result1 } = renderHook(() => useEcsSchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result1.current.isLoading).toBe(false));

      const freshClient = createFreshQueryClient();
      const { result: result2 } = renderHook(() => useEcsSchema(), {
        wrapper: createWrapper(freshClient),
      });

      await waitFor(() => expect(result2.current.isLoading).toBe(false));

      expect(mockHttp.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should return undefined data while loading (before API resolves)', () => {
      mockHttp.get.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useEcsSchema(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should return empty array when API responds with empty data array', async () => {
      mockHttp.get.mockResolvedValue({ version: '9.3.0', data: [] });

      const { result } = renderHook(() => useEcsSchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Empty array [] is truthy, so it goes through the happy path
      expect(result.current.data).toEqual([]);
    });

    it('should not expose an osqueryVersion field (ECS hook does not have one)', async () => {
      const { result } = renderHook(() => useEcsSchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current).not.toHaveProperty('osqueryVersion');
    });
  });
});
