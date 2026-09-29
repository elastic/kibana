/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ConnectorItem } from '../../../../common/http_api/tools';
import { useAgentConnectors } from './use_agent_connectors';
import { queryKeys } from '../../query_keys';

const connector = (id: string, name: string, actionTypeId: string): ConnectorItem => ({
  id,
  name,
  actionTypeId,
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
  subActions: [],
});

const ALL_CONNECTORS: ConnectorItem[] = [
  connector('c1', 'Slack', '.slack'),
  connector('c2', 'Email', '.email'),
  connector('c3', 'HTTP', '.http'),
];

const update = vi.fn().mockResolvedValue({});
const addSuccessToast = vi.fn();
const addErrorToast = vi.fn();

vi.mock('../agents/use_agent_by_id');
vi.mock('../tools/use_mcp_connectors');
vi.mock('../use_agent_builder_service');
vi.mock('../use_toasts');

const { useAgentBuilderAgentById } = await vi.importMock('../agents/use_agent_by_id');
const { useListConnectors } = await vi.importMock('../tools/use_mcp_connectors');
const { useAgentBuilderServices } = await vi.importMock('../use_agent_builder_service');
const { useToasts } = await vi.importMock('../use_toasts');

describe('useAgentConnectors', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    useListConnectors.mockReturnValue({
      connectors: ALL_CONNECTORS,
      isLoading: false,
      error: null,
    });
    useAgentBuilderServices.mockReturnValue({ agentService: { update } });
    useToasts.mockReturnValue({ addSuccessToast, addErrorToast });
  });

  const setup = (connectorIds: string[] | undefined) => {
    const agent = { id: 'agent-1', configuration: { connector_ids: connectorIds } };
    useAgentBuilderAgentById.mockReturnValue({ agent });
    queryClient.setQueryData(queryKeys.agentProfiles.byId('agent-1'), agent);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    return renderHook(() => useAgentConnectors({ agentId: 'agent-1' }), { wrapper });
  };

  describe('unassign', () => {
    it('when connector_ids is undefined (no connectors), unassign is a no-op (empty stays empty)', async () => {
      const { result } = setup(undefined);

      await act(async () => {
        result.current.unassign(ALL_CONNECTORS[0]);
      });

      expect(update).toHaveBeenCalledWith('agent-1', {
        configuration: { connector_ids: [] },
      });
    });

    it('when connector_ids is an explicit list, removes the connector from it', async () => {
      const { result } = setup(['c1', 'c2']);

      await act(async () => {
        result.current.unassign(ALL_CONNECTORS[0]);
      });

      expect(update).toHaveBeenCalledWith('agent-1', {
        configuration: { connector_ids: ['c2'] },
      });
    });
  });

  describe('assign', () => {
    it('appends the connector to the existing list', async () => {
      const { result } = setup(['c1']);

      await act(async () => {
        result.current.assign(ALL_CONNECTORS[1]);
      });

      expect(update).toHaveBeenCalledWith('agent-1', {
        configuration: { connector_ids: ['c1', 'c2'] },
      });
    });

    it('is a no-op when the connector is already in the list', async () => {
      const { result } = setup(['c1', 'c2']);

      await act(async () => {
        result.current.assign(ALL_CONNECTORS[0]);
      });

      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('assignedConnectors', () => {
    it('returns empty array when connector_ids is undefined (no connectors assigned)', () => {
      const { result } = setup(undefined);
      expect(result.current.assignedConnectors).toEqual([]);
    });

    it('returns only assigned connectors when connector_ids is an explicit list', () => {
      const { result } = setup(['c1', 'c3']);
      expect(result.current.assignedConnectors).toEqual([ALL_CONNECTORS[0], ALL_CONNECTORS[2]]);
    });

    it('returns empty array when connector_ids is []', () => {
      const { result } = setup([]);
      expect(result.current.assignedConnectors).toEqual([]);
    });
  });

  describe('side effects', () => {
    it('writes the optimistic update to the query cache before the server responds', async () => {
      const { result } = setup(['c1', 'c2']);

      await act(async () => {
        result.current.unassign(ALL_CONNECTORS[0]);
      });

      const cached = queryClient.getQueryData<{ configuration: { connector_ids: string[] } }>(
        queryKeys.agentProfiles.byId('agent-1')
      );
      expect(cached?.configuration.connector_ids).toEqual(['c2']);
    });

    it('invalidates the agent query after the mutation settles', async () => {
      vi.spyOn(queryClient, 'invalidateQueries');
      const { result } = setup(['c1', 'c2']);

      await act(async () => {
        result.current.unassign(ALL_CONNECTORS[0]);
      });

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.agentProfiles.byId('agent-1'),
      });
    });
  });
});
