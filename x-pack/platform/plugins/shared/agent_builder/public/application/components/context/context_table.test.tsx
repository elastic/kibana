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
jest.mock('../../hooks/ai_indices/use_inherited_ai_indices');
jest.mock('../../hooks/ai_indices/use_agent_ai_indices');
jest.mock('../../hooks/use_navigation', () => ({
  useNavigation: () => ({ navigateToContextEngine: mockNavigateToContextEngine }),
}));

const { useAgentBuilderAgents } = jest.requireMock('../../hooks/agents/use_agents');
const { useListAiIndices } = jest.requireMock('../../hooks/ai_indices/use_list_ai_indices');
const { useInheritedAiIndices } = jest.requireMock(
  '../../hooks/ai_indices/use_inherited_ai_indices'
);
const { useAgentAiIndices } = jest.requireMock('../../hooks/ai_indices/use_agent_ai_indices');

const agent = (id: string, assignedAiIndices: string[] = [], canUpdate = true) =>
  ({
    id,
    name: `Agent ${id}`,
    type: 'chat',
    configuration: { tools: [], ai_indices: assignedAiIndices },
    permissions: { update_agent: canUpdate },
  } as unknown as AgentDefinitionWithPermissions);

/** Assigned indices come from the agent list; inherited ones from the base-configuration route. */
const show = (
  agents: AgentDefinitionWithPermissions[],
  inheritedAiIndicesByAgentId: Record<string, string[]> = {},
  { isLoadingInherited = false }: { isLoadingInherited?: boolean } = {}
) => {
  useAgentBuilderAgents.mockReturnValue({ agents, isLoading: false });
  useInheritedAiIndices.mockReturnValue({
    inheritedAiIndicesByAgentId,
    isLoading: isLoadingInherited,
    error: undefined,
  });
};

const openSelector = async () => {
  await userEvent.click(screen.getByTestId('agentBuilderAiIndexSelectorButton'));
  return screen.findByTestId('agentBuilderAiIndexSelectable');
};

const optionFor = (selectable: HTMLElement, id: string) =>
  within(selectable).getByText(id).closest('li');

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
      aiIndices: [{ id: 'elastic' }, { id: 'sales' }, { id: 'support' }],
      isLoading: false,
      error: undefined,
    });
    show([]);
  });

  it('renders one row per agent', () => {
    show([agent('a'), agent('b')], { a: ['elastic'], b: ['elastic'] });

    renderTable();

    expect(screen.getByText('Agent a')).toBeInTheDocument();
    expect(screen.getByText('Agent b')).toBeInTheDocument();
  });

  describe('status badge', () => {
    it('shows On when the agent has AI indices assigned', () => {
      show([agent('a', ['sales'])], { a: ['elastic'] });

      renderTable();

      expect(screen.getByTestId('agentBuilderContextStatusBadge-on')).toBeInTheDocument();
    });

    it('shows Auto when only the agent type contributes AI indices', () => {
      show([agent('a')], { a: ['elastic'] });

      renderTable();

      expect(screen.getByTestId('agentBuilderContextStatusBadge-auto')).toBeInTheDocument();
      expect(screen.getByTestId('agentBuilderAiIndexSelectorButton')).toBeInTheDocument();
    });

    it('shows Off, with static text and no selector, when neither layer contributes', () => {
      show([agent('a')], { a: [] });

      renderTable();

      expect(screen.getByTestId('agentBuilderContextStatusBadge-off')).toBeInTheDocument();
      expect(screen.getByTestId('agentBuilderContextOffMessage')).toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderAiIndexSelectorButton')).not.toBeInTheDocument();
    });

    // A code-registered type such as the sig-events ones contributes AI indices, so its agents
    // must not read as Off just because none are assigned to them directly.
    it('shows Auto for a type whose contributed index is not registered in the Context Engine', () => {
      show([agent('a')], { a: ['another-one'] });

      renderTable();

      expect(screen.getByTestId('agentBuilderContextStatusBadge-auto')).toBeInTheDocument();
    });
  });

  it('disables the selector when the user cannot update the agent', () => {
    show([agent('a', ['sales'], false)], { a: [] });

    renderTable();

    expect(screen.getByTestId('agentBuilderAiIndexSelectorButton')).toBeDisabled();
  });

  it('submits the merged id list when an AI index is checked', async () => {
    show([agent('a', ['sales'])], { a: [] });

    renderTable();

    await userEvent.click(within(await openSelector()).getByText('support'));

    expect(setAiIndices).toHaveBeenCalledWith({
      agentId: 'a',
      agentName: 'Agent a',
      aiIndices: ['sales', 'support'],
    });
  });

  describe('AI indices contributed by the agent type', () => {
    it('are ticked and cannot be unticked', async () => {
      show([agent('a')], { a: ['elastic'] });

      renderTable();

      const elastic = optionFor(await openSelector(), 'elastic');

      expect(elastic).toHaveAttribute('aria-checked', 'true');
      expect(elastic).toHaveAttribute('aria-disabled', 'true');
    });

    it('are listed even when the Context Engine does not know them', async () => {
      show([agent('a')], { a: ['another-one'] });

      renderTable();

      const unknown = optionFor(await openSelector(), 'another-one');

      expect(unknown).toHaveAttribute('aria-checked', 'true');
      expect(unknown).toHaveAttribute('aria-disabled', 'true');
    });

    it('are never written back onto the agent', async () => {
      show([agent('a')], { a: ['elastic'] });

      renderTable();

      await userEvent.click(within(await openSelector()).getByText('sales'));

      expect(setAiIndices).toHaveBeenCalledWith({
        agentId: 'a',
        agentName: 'Agent a',
        aiIndices: ['sales'],
      });
    });

    // The trap that made `inherited − assigned` wrong: an id in both is still inherited, so
    // it must stay disabled rather than becoming editable.
    it('stay disabled when the agent also stores the same id', async () => {
      show([agent('a', ['elastic'])], { a: ['elastic'] });

      renderTable();

      expect(optionFor(await openSelector(), 'elastic')).toHaveAttribute('aria-disabled', 'true');
    });

    it('are selectable like any other index when the type contributes nothing', async () => {
      show([agent('a', ['sales'])], { a: [] });

      renderTable();

      const elastic = optionFor(await openSelector(), 'elastic');

      expect(elastic).toHaveAttribute('aria-checked', 'false');
      expect(elastic).not.toHaveAttribute('aria-disabled', 'true');
    });
  });

  // The API does not validate stored ids, so an agent can reference an index that was deleted or
  // that falls outside the list endpoint's cap. Dropping those on an unrelated edit would destroy
  // configuration with no warning.
  describe('stored AI indices the Context Engine does not know about', () => {
    it('are listed as checked', async () => {
      show([agent('a', ['deleted-index'])], { a: [] });

      renderTable();

      expect(optionFor(await openSelector(), 'deleted-index')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('survive an unrelated edit', async () => {
      show([agent('a', ['deleted-index'])], { a: [] });

      renderTable();

      await userEvent.click(within(await openSelector()).getByText('sales'));

      // Order carries no meaning here, so assert on membership rather than position.
      expect(setAiIndices.mock.calls[0][0].aiIndices.sort()).toEqual(['deleted-index', 'sales']);
    });
  });

  // Inherited indices arrive on a separate request. Rendering rows first would show every agent
  // as Off, since `base` would be empty for all of them.
  it('renders no rows while inherited indices are still loading', () => {
    show([agent('a')], {}, { isLoadingInherited: true });

    renderTable();

    expect(screen.queryByText('Agent a')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderContextStatusBadge-off')).not.toBeInTheDocument();
  });

  it('surfaces an error when the AI index list cannot be loaded', () => {
    useListAiIndices.mockReturnValue({ aiIndices: [], isLoading: false, error: new Error('boom') });
    show([agent('a')], { a: [] });

    renderTable();

    expect(screen.getByTestId('agentBuilderAiIndicesError')).toBeInTheDocument();
  });
});
