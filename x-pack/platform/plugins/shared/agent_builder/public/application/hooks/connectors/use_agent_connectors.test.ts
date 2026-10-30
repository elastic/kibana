/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
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

const SKILLED_CONNECTOR = connector('c4', 'Skilled', '.skilled');
const SKILL_FILE = {
  id: 'connector-skilled',
  name: 'connector-skilled',
  description: 'Skilled connector skill',
  content: 'skill content',
  resources: [{ name: 'oncall', relativePath: './resources', content: 'resource content' }],
};

const update = jest.fn().mockResolvedValue({});
const createSkill = jest.fn().mockResolvedValue({});
const addSuccessToast = jest.fn();
const addErrorToast = jest.fn();

jest.mock('../agents/use_agent_by_id');
jest.mock('../tools/use_mcp_connectors');
jest.mock('../use_agent_builder_service');
jest.mock('../use_toasts');
jest.mock('@kbn/connector-specs', () => ({ getConnectorSpec: jest.fn() }));

const { useAgentBuilderAgentById } = jest.requireMock('../agents/use_agent_by_id');
const { useListConnectors } = jest.requireMock('../tools/use_mcp_connectors');
const { useAgentBuilderServices } = jest.requireMock('../use_agent_builder_service');
const { useToasts } = jest.requireMock('../use_toasts');
const { getConnectorSpec } = jest.requireMock('@kbn/connector-specs');

describe('useAgentConnectors', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    useListConnectors.mockReturnValue({
      connectors: ALL_CONNECTORS,
      isLoading: false,
      error: null,
    });
    useAgentBuilderServices.mockReturnValue({
      agentService: { update },
      skillsService: { create: createSkill },
    });
    useToasts.mockReturnValue({ addSuccessToast, addErrorToast });
    getConnectorSpec.mockImplementation((actionTypeId: string) =>
      actionTypeId === '.skilled' ? { skillFiles: [SKILL_FILE] } : undefined
    );
  });

  const setup = (connectorIds: string[] | undefined, skillIds?: string[]) => {
    const agent = {
      id: 'agent-1',
      configuration: { connector_ids: connectorIds, skill_ids: skillIds },
    };
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

  describe('assign with connector skills', () => {
    const cachedConfiguration = () =>
      queryClient.getQueryData<{
        configuration: { connector_ids?: string[]; skill_ids?: string[] };
      }>(queryKeys.agentProfiles.byId('agent-1'))?.configuration;

    it('creates the connector skills and saves connector and skill ids in one update', async () => {
      const { result } = setup(['c1']);

      await act(async () => {
        result.current.assign(SKILLED_CONNECTOR);
      });

      await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
      expect(createSkill).toHaveBeenCalledWith({
        id: 'connector-skilled',
        name: 'connector-skilled',
        description: 'Skilled connector skill',
        content: 'skill content',
        referenced_content: [
          { name: 'oncall', relativePath: './resources', content: 'resource content' },
        ],
        tool_ids: [],
      });
      expect(update).toHaveBeenCalledWith('agent-1', {
        configuration: { connector_ids: ['c1', 'c4'], skill_ids: ['connector-skilled'] },
      });
      expect(addSuccessToast).toHaveBeenCalledTimes(1);
    });

    it('links a skill that already exists (409) without reporting an error', async () => {
      createSkill.mockRejectedValueOnce({ response: { status: 409 } });
      const { result } = setup(['c1']);

      await act(async () => {
        result.current.assign(SKILLED_CONNECTOR);
      });

      await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
      expect(update).toHaveBeenCalledWith('agent-1', {
        configuration: { connector_ids: ['c1', 'c4'], skill_ids: ['connector-skilled'] },
      });
      expect(addErrorToast).not.toHaveBeenCalled();
    });

    it('does not link a skill that failed to create, but still adds the connector and reports it', async () => {
      createSkill.mockRejectedValueOnce({ response: { status: 403 } });
      const { result } = setup(['c1']);

      await act(async () => {
        result.current.assign(SKILLED_CONNECTOR);
      });

      await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
      expect(update).toHaveBeenCalledWith('agent-1', {
        configuration: { connector_ids: ['c1', 'c4'] },
      });
      expect(addErrorToast).toHaveBeenCalledWith({
        title: 'Connector added, but its skill could not be created.',
      });
    });

    it('adds only the missing skill when the connector is already assigned', async () => {
      const { result } = setup(['c1', 'c4'], ['other-skill']);

      await act(async () => {
        result.current.assign(SKILLED_CONNECTOR);
      });

      await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
      expect(update).toHaveBeenCalledWith('agent-1', {
        configuration: { skill_ids: ['other-skill', 'connector-skilled'] },
      });
      expect(addSuccessToast).not.toHaveBeenCalled();
    });

    it('does not update the agent when the connector and its skill are already assigned', async () => {
      const { result } = setup(['c4'], ['connector-skilled']);

      await act(async () => {
        result.current.assign(SKILLED_CONNECTOR);
      });

      await waitFor(() => expect(createSkill).toHaveBeenCalledTimes(1));
      expect(update).not.toHaveBeenCalled();
    });

    it('does not create skills for a connector type without skill files', async () => {
      const { result } = setup(['c1']);

      await act(async () => {
        result.current.assign(ALL_CONNECTORS[1]);
      });

      expect(createSkill).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith('agent-1', {
        configuration: { connector_ids: ['c1', 'c2'] },
      });
    });

    it('reports a single failure and restores the cache when the combined update fails', async () => {
      update.mockRejectedValueOnce(new Error('boom'));
      const { result } = setup(['c1'], ['other-skill']);

      await act(async () => {
        result.current.assign(SKILLED_CONNECTOR);
      });

      await waitFor(() => expect(addErrorToast).toHaveBeenCalledTimes(1));
      expect(addErrorToast).toHaveBeenCalledWith({ title: 'Failed to update connectors' });
      expect(addSuccessToast).not.toHaveBeenCalled();
      expect(cachedConfiguration()).toEqual({
        connector_ids: ['c1'],
        skill_ids: ['other-skill'],
      });
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
      jest.spyOn(queryClient, 'invalidateQueries');
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
