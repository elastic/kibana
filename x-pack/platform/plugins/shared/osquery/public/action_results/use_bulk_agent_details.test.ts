/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import { useBulkAgentDetails } from './use_bulk_agent_details';
import { useKibana } from '../common/lib/kibana';

jest.mock('../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const BULK_AGENT_DETAILS_ROUTE = '/internal/osquery/fleet_wrapper/agents/_bulk';

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

describe('useBulkAgentDetails', () => {
  let mockHttpPost: jest.Mock;
  let mockAddError: jest.Mock;
  let mockRemoveToast: jest.Mock;
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttpPost = jest.fn().mockResolvedValue({ agents: [] });
    mockAddError = jest.fn();
    mockRemoveToast = jest.fn();
    queryClient = createFreshQueryClient();

    useKibanaMock.mockReturnValue({
      services: {
        http: { post: mockHttpPost },
        notifications: { toasts: { addError: mockAddError, remove: mockRemoveToast } },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  describe('request contract', () => {
    it('should post the agent ids to the internal bulk fleet_wrapper route', async () => {
      const agentIds = ['agent-1', 'agent-2'];

      renderHook(() => useBulkAgentDetails(agentIds), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(mockHttpPost).toHaveBeenCalledTimes(1));

      // Version is pinned to API_VERSIONS.internal.v1; a bump must be a conscious change.
      expect(mockHttpPost).toHaveBeenCalledWith(BULK_AGENT_DETAILS_ROUTE, {
        version: '1',
        body: JSON.stringify({ agentIds }),
      });
    });

    it('should not issue a request when there are no agent ids', async () => {
      const { result } = renderHook(() => useBulkAgentDetails([]), {
        wrapper: createWrapper(queryClient),
      });

      // The `enabled: agentIds.length > 0` guard must keep the query idle, otherwise every
      // mount POSTs an empty agentIds list.
      await waitFor(() => expect(result.current.agentNameMap.size).toBe(0));
      expect(mockHttpPost).not.toHaveBeenCalled();
    });
  });

  describe('agentNameMap', () => {
    it('should map each agent id to its local_metadata hostname', async () => {
      mockHttpPost.mockResolvedValue({
        agents: [
          { id: 'agent-1', local_metadata: { host: { name: 'production-server-01' } } },
          { id: 'agent-2', local_metadata: { host: { name: 'production-server-02' } } },
        ],
      });

      const { result } = renderHook(() => useBulkAgentDetails(['agent-1', 'agent-2']), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.agentNameMap.size).toBe(2));

      expect(result.current.agentNameMap.get('agent-1')).toBe('production-server-01');
      expect(result.current.agentNameMap.get('agent-2')).toBe('production-server-02');
    });

    it('should fall back to the agent id when no hostname is reported', async () => {
      mockHttpPost.mockResolvedValue({
        agents: [
          { id: 'agent-without-metadata' },
          { id: 'agent-without-host', local_metadata: {} },
          { id: 'agent-with-empty-name', local_metadata: { host: { name: '' } } },
        ],
      });

      const { result } = renderHook(
        () =>
          useBulkAgentDetails([
            'agent-without-metadata',
            'agent-without-host',
            'agent-with-empty-name',
          ]),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.agentNameMap.size).toBe(3));

      expect(result.current.agentNameMap.get('agent-without-metadata')).toBe(
        'agent-without-metadata'
      );
      expect(result.current.agentNameMap.get('agent-without-host')).toBe('agent-without-host');
      expect(result.current.agentNameMap.get('agent-with-empty-name')).toBe(
        'agent-with-empty-name'
      );
    });

    it('should return an empty map while the request is in flight', () => {
      mockHttpPost.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useBulkAgentDetails(['agent-1']), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.agentNameMap.size).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should surface a toast and keep an empty map when the bulk fetch fails', async () => {
      const error = new Error('Fleet service unavailable');
      mockHttpPost.mockRejectedValue(error);

      const { result } = renderHook(() => useBulkAgentDetails(['agent-1']), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(1));

      expect(mockAddError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          title: 'Error fetching agent details',
          toastMessage:
            'Failed to load agent names. Please check your network connection and try again.',
        })
      );
      expect(result.current.agentNameMap.size).toBe(0);
    });
  });

  describe('caching', () => {
    it('should reuse the cached response for the same agent ids', async () => {
      const agentIds = ['agent-1', 'agent-2'];
      mockHttpPost.mockResolvedValue({
        agents: agentIds.map((id) => ({ id, local_metadata: { host: { name: `host-${id}` } } })),
      });

      const { result: firstResult } = renderHook(() => useBulkAgentDetails(agentIds), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(firstResult.current.agentNameMap.size).toBe(2));
      expect(mockHttpPost).toHaveBeenCalledTimes(1);

      // Same query client and same ids: `staleTime` must serve the cached response.
      const { result: secondResult } = renderHook(() => useBulkAgentDetails([...agentIds]), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(secondResult.current.agentNameMap.size).toBe(2));
      expect(mockHttpPost).toHaveBeenCalledTimes(1);
    });

    it('should treat a reordered agent id list as the same cache entry', async () => {
      mockHttpPost.mockResolvedValue({
        agents: [
          { id: 'agent-1', local_metadata: { host: { name: 'host-1' } } },
          { id: 'agent-2', local_metadata: { host: { name: 'host-2' } } },
        ],
      });

      const { result, rerender } = renderHook(
        ({ agentIds }: { agentIds: string[] }) => useBulkAgentDetails(agentIds),
        {
          wrapper: createWrapper(queryClient),
          initialProps: { agentIds: ['agent-1', 'agent-2'] },
        }
      );

      await waitFor(() => expect(result.current.agentNameMap.size).toBe(2));
      expect(mockHttpPost).toHaveBeenCalledTimes(1);

      // The query key is derived from the sorted ids, so a different order is a cache hit.
      rerender({ agentIds: ['agent-2', 'agent-1'] });

      await waitFor(() => expect(result.current.agentNameMap.size).toBe(2));
      expect(mockHttpPost).toHaveBeenCalledTimes(1);
    });

    it('should fetch again for a different set of agent ids', async () => {
      const { rerender } = renderHook(
        ({ agentIds }: { agentIds: string[] }) => useBulkAgentDetails(agentIds),
        {
          wrapper: createWrapper(queryClient),
          initialProps: { agentIds: ['agent-1'] },
        }
      );

      await waitFor(() => expect(mockHttpPost).toHaveBeenCalledTimes(1));

      rerender({ agentIds: ['agent-2'] });

      await waitFor(() => expect(mockHttpPost).toHaveBeenCalledTimes(2));
      expect(mockHttpPost).toHaveBeenLastCalledWith(BULK_AGENT_DETAILS_ROUTE, {
        version: '1',
        body: JSON.stringify({ agentIds: ['agent-2'] }),
      });
    });
  });
});
