/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import type { AgentDefinitionWithPermissions } from '../../../../common/http_api/agents';
import { ContextTable } from './context_table';

const setAiIndices = jest.fn();
const mockNavigateToContextEngine = jest.fn();

jest.mock('../../hooks/agents/use_agents');
jest.mock('../../hooks/ai_indices/use_list_ai_indices');
jest.mock('../../hooks/ai_indices/use_agent_ai_indices');
jest.mock('../../hooks/use_navigation', () => ({
  useNavigation: () => ({ navigateToContextEngine: mockNavigateToContextEngine }),
}));

const { useAgentBuilderAgents } = jest.requireMock('../../hooks/agents/use_agents');
const { useListAiIndices } = jest.requireMock('../../hooks/ai_indices/use_list_ai_indices');
const { useAgentAiIndices } = jest.requireMock('../../hooks/ai_indices/use_agent_ai_indices');

const agent = (
  overrides: Partial<AgentDefinitionWithPermissions> & { id: string }
): AgentDefinitionWithPermissions =>
  ({
    name: `Agent ${overrides.id}`,
    type: 'chat',
    configuration: { tools: [], ai_indices: [] },
    permissions: { update_agent: true },
    ...overrides,
  } as unknown as AgentDefinitionWithPermissions);

const renderTable = () =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <ContextTable />
      </IntlProvider>
    </EuiProvider>
  );

describe('ContextTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAgentAiIndices.mockReturnValue({ setAiIndices, isUpdating: false });
    useListAiIndices.mockReturnValue({
      aiIndices: [{ id: 'sales' }, { id: 'support' }],
      isLoading: false,
      error: undefined,
    });
    useAgentBuilderAgents.mockReturnValue({ agents: [], isLoading: false });
  });

  it('renders one row per agent', () => {
    useAgentBuilderAgents.mockReturnValue({
      agents: [agent({ id: 'a' }), agent({ id: 'b' })],
      isLoading: false,
    });

    renderTable();

    expect(screen.getByText('Agent a')).toBeInTheDocument();
    expect(screen.getByText('Agent b')).toBeInTheDocument();
  });

  it('shows the Auto badge and a selector for a chat agent with no AI indices', () => {
    useAgentBuilderAgents.mockReturnValue({ agents: [agent({ id: 'a' })], isLoading: false });

    renderTable();

    expect(screen.getByTestId('agentBuilderContextStatusBadge-auto')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderAiIndexSelectorButton')).toBeInTheDocument();
  });

  it('shows the On badge when the agent has AI indices configured', () => {
    useAgentBuilderAgents.mockReturnValue({
      agents: [agent({ id: 'a', configuration: { tools: [], ai_indices: ['sales'] } as never })],
      isLoading: false,
    });

    renderTable();

    expect(screen.getByTestId('agentBuilderContextStatusBadge-on')).toBeInTheDocument();
  });

  it('shows the Off badge and static text, with no selector, for a non-chat agent type', () => {
    useAgentBuilderAgents.mockReturnValue({
      agents: [agent({ id: 'a', type: 'custom_type' })],
      isLoading: false,
    });

    renderTable();

    expect(screen.getByTestId('agentBuilderContextStatusBadge-off')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderContextOffMessage')).toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderAiIndexSelectorButton')).not.toBeInTheDocument();
  });

  it('disables the selector when the user cannot update the agent', () => {
    useAgentBuilderAgents.mockReturnValue({
      agents: [agent({ id: 'a', permissions: { update_agent: false } as never })],
      isLoading: false,
    });

    renderTable();

    expect(screen.getByTestId('agentBuilderAiIndexSelectorButton')).toBeDisabled();
  });

  it('submits the merged id list when an AI index is checked', async () => {
    useAgentBuilderAgents.mockReturnValue({
      agents: [agent({ id: 'a', configuration: { tools: [], ai_indices: ['sales'] } as never })],
      isLoading: false,
    });

    renderTable();

    await userEvent.click(screen.getByTestId('agentBuilderAiIndexSelectorButton'));
    const selectable = await screen.findByTestId('agentBuilderAiIndexSelectable');
    await userEvent.click(within(selectable).getByText('support'));

    expect(setAiIndices).toHaveBeenCalledWith({
      agentId: 'a',
      agentName: 'Agent a',
      aiIndices: ['sales', 'support'],
    });
  });

  describe('the default `elastic` AI index', () => {
    beforeEach(() => {
      useListAiIndices.mockReturnValue({
        aiIndices: [{ id: 'elastic' }, { id: 'sales' }],
        isLoading: false,
        error: undefined,
      });
    });

    it('is ticked and cannot be unticked for a chat agent', async () => {
      useAgentBuilderAgents.mockReturnValue({ agents: [agent({ id: 'a' })], isLoading: false });

      renderTable();

      await userEvent.click(screen.getByTestId('agentBuilderAiIndexSelectorButton'));
      const elasticOption = within(await screen.findByTestId('agentBuilderAiIndexSelectable'))
        .getByText('elastic')
        .closest('li');

      expect(elasticOption).toHaveAttribute('aria-checked', 'true');
      expect(elasticOption).toHaveAttribute('aria-disabled', 'true');
    });

    it('is never persisted when another index is selected', async () => {
      useAgentBuilderAgents.mockReturnValue({ agents: [agent({ id: 'a' })], isLoading: false });

      renderTable();

      await userEvent.click(screen.getByTestId('agentBuilderAiIndexSelectorButton'));
      const selectable = await screen.findByTestId('agentBuilderAiIndexSelectable');
      await userEvent.click(within(selectable).getByText('sales'));

      expect(setAiIndices).toHaveBeenCalledWith({
        agentId: 'a',
        agentName: 'Agent a',
        aiIndices: ['sales'],
      });
    });

    // Storing it is redundant, but an unrelated edit must not silently drop it.
    it('is preserved when the agent already stores it explicitly', async () => {
      useAgentBuilderAgents.mockReturnValue({
        agents: [
          agent({ id: 'a', configuration: { tools: [], ai_indices: ['elastic'] } as never }),
        ],
        isLoading: false,
      });

      renderTable();

      await userEvent.click(screen.getByTestId('agentBuilderAiIndexSelectorButton'));
      const selectable = await screen.findByTestId('agentBuilderAiIndexSelectable');
      await userEvent.click(within(selectable).getByText('sales'));

      expect(setAiIndices).toHaveBeenCalledWith({
        agentId: 'a',
        agentName: 'Agent a',
        aiIndices: ['elastic', 'sales'],
      });
    });

    it('is selectable like any other index for a non-chat agent that does not get it by default', async () => {
      useAgentBuilderAgents.mockReturnValue({
        agents: [
          agent({
            id: 'a',
            type: 'custom_type',
            configuration: { tools: [], ai_indices: ['sales'] } as never,
          }),
        ],
        isLoading: false,
      });

      renderTable();

      await userEvent.click(screen.getByTestId('agentBuilderAiIndexSelectorButton'));
      const elasticOption = within(await screen.findByTestId('agentBuilderAiIndexSelectable'))
        .getByText('elastic')
        .closest('li');

      expect(elasticOption).toHaveAttribute('aria-checked', 'false');
      expect(elasticOption).not.toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('surfaces an error when the AI index list cannot be loaded', () => {
    useListAiIndices.mockReturnValue({
      aiIndices: [],
      isLoading: false,
      error: new Error('boom'),
    });

    renderTable();

    expect(screen.getByTestId('agentBuilderAiIndicesError')).toBeInTheDocument();
  });
});
