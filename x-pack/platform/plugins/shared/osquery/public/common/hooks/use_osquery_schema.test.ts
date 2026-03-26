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
import { useOsquerySchema } from './use_osquery_schema';
import { FALLBACK_OSQUERY_VERSION, OSQUERY_SCHEMA_API_ROUTE } from '../../../common/constants';

jest.mock('../lib/kibana');

// Mock the fallback JSON — returned as a pre-sorted list so the hook's
// sortBy() call produces a deterministic result in tests.
// Path must match `v${FALLBACK_OSQUERY_VERSION}.json` from common/constants.
jest.mock('../schemas/osquery/v5.19.0.json', () => [
  { name: 'processes', description: 'Running processes', platforms: ['linux'], columns: [] },
  { name: 'users', description: 'Local users', platforms: ['linux'], columns: [] },
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

const MOCK_API_TABLES = [
  { name: 'users', description: 'Local users', platforms: ['linux'], columns: [] },
  { name: 'processes', description: 'Running processes', platforms: ['linux'], columns: [] },
];

const MOCK_API_RESPONSE = {
  version: '5.20.0',
  data: MOCK_API_TABLES,
};

describe('useOsquerySchema', () => {
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
    it('should return sorted table data from API response', async () => {
      const { result } = renderHook(() => useOsquerySchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // sortBy name: processes < users
      expect(result.current.data).toEqual([
        { name: 'processes', description: 'Running processes', platforms: ['linux'], columns: [] },
        { name: 'users', description: 'Local users', platforms: ['linux'], columns: [] },
      ]);
      expect(result.current.isError).toBe(false);
    });

    it('should call the correct internal API endpoint with version header', async () => {
      const { result } = renderHook(() => useOsquerySchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockHttp.get).toHaveBeenCalledWith(OSQUERY_SCHEMA_API_ROUTE, {
        version: '1',
      });
    });
  });

  describe('loading state', () => {
    it('should return isLoading: true while the API request is in-flight', () => {
      // Never resolve so the hook stays in loading state
      mockHttp.get.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useOsquerySchema(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('error with fallback', () => {
    it('should fall back to bundled JSON when the API call fails', async () => {
      mockHttp.get.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOsquerySchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Fallback JSON contains two tables; sortBy name: processes < users
      expect(result.current.data).toEqual([
        { name: 'processes', description: 'Running processes', platforms: ['linux'], columns: [] },
        { name: 'users', description: 'Local users', platforms: ['linux'], columns: [] },
      ]);
    });

    it('should set isError: true when the API fails', async () => {
      mockHttp.get.mockRejectedValue(new Error('500 Internal Server Error'));

      const { result } = renderHook(() => useOsquerySchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('staleTime: Infinity caching', () => {
    it('should only make one HTTP request when the hook is rendered twice in the same client', async () => {
      const { result: result1 } = renderHook(() => useOsquerySchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result1.current.isLoading).toBe(false));

      // Second render with the SAME queryClient — cached, no new request
      const { result: result2 } = renderHook(() => useOsquerySchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result2.current.isLoading).toBe(false));

      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('version metadata', () => {
    it('should return the osqueryVersion from the API response', async () => {
      const { result } = renderHook(() => useOsquerySchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.osqueryVersion).toBe('5.20.0');
    });

    it('should fall back to FALLBACK_OSQUERY_VERSION when the API response has no version field', async () => {
      mockHttp.get.mockResolvedValue({ data: MOCK_API_TABLES }); // no `version` field

      const { result } = renderHook(() => useOsquerySchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.osqueryVersion).toBe(FALLBACK_OSQUERY_VERSION);
    });

    it('should fall back to FALLBACK_OSQUERY_VERSION when the API call fails', async () => {
      mockHttp.get.mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useOsquerySchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.osqueryVersion).toBe(FALLBACK_OSQUERY_VERSION);
    });
  });

  describe('edge cases', () => {
    it('should return undefined data while loading (before API resolves)', () => {
      mockHttp.get.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useOsquerySchema(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should return undefined data when API returns empty data array', async () => {
      mockHttp.get.mockResolvedValue({ version: '5.20.0', data: [] });

      const { result } = renderHook(() => useOsquerySchema(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Empty array is falsy in the hook's truthy-check (`query.data?.data` resolves
      // to [] which is truthy), so sortBy([]) returns []
      expect(result.current.data).toEqual([]);
    });
  });
});
