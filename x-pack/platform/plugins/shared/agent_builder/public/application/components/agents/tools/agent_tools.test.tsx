/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { AgentTools } from './agent_tools';

vi.mock('react-router-dom', () => {
  const mocked = {
    useParams: () => ({ agentId: 'agent-1' }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_navigation', () => {
  const mocked = {
    useNavigation: () => ({ createAgentBuilderUrl: () => '#' }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_flyout_state');

vi.mock('../../../hooks/use_query_state');

vi.mock('../common/page_wrapper', () => {
  const mocked = {
    PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../common/styles', () => {
  const mocked = {
    useListDetailPageStyles: () => ({
      loadingSpinner: {},
      header: {},
      body: {},
      searchColumn: {},
      searchInputWrapper: {},
      scrollableList: {},
      detailPanelWrapper: {},
      noSelectionPlaceholder: {},
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./tool_library_panel', () => {
  const mocked = {
    ToolLibraryPanel: () => <div data-test-subj="toolLibraryPanel" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./tool_create_flyout', () => {
  const mocked = {
    ToolCreateFlyout: ({ onToolCreated }: { onToolCreated?: (tool: { id: string }) => void }) => (
      <div data-test-subj="toolCreateFlyout">
        <button onClick={() => onToolCreated?.({ id: 'new-tool' })}>Simulate tool created</button>
      </div>
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./tool_detail_panel', () => {
  const mocked = {
    ToolDetailPanel: () => <div data-test-subj="toolDetailPanel" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./tools_customize_empty_state', () => {
  const mocked = {
    ToolsCustomizeEmptyState: () => <div data-test-subj="toolsCustomizeEmptyState" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../common/active_item_row', () => {
  const mocked = {
    ActiveItemRow: () => <div data-test-subj="activeItemRow" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/agents/use_agent_by_id');
vi.mock('../../../hooks/agents/use_can_update_agent');
vi.mock('../../../hooks/tools/use_tools');
vi.mock('./use_tools_mutation');

const { useAgentBuilderAgentById } = await vi.importMock('../../../hooks/agents/use_agent_by_id');
const { useCanUpdateAgent } = await vi.importMock('../../../hooks/agents/use_can_update_agent');
const { useToolsService } = await vi.importMock('../../../hooks/tools/use_tools');
const { useToolsMutation } = await vi.importMock('./use_tools_mutation');
const { useQueryState } = await vi.importMock('../../../hooks/use_query_state');
const { useFlyoutState } = await vi.importMock('../../../hooks/use_flyout_state');

const renderComponent = () =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <AgentTools />
      </IntlProvider>
    </EuiProvider>
  );

describe('AgentTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useQueryState.mockReturnValue([undefined, vi.fn()]);

    useFlyoutState.mockReturnValue({
      isOpen: false,
      openFlyout: vi.fn(),
      closeFlyout: vi.fn(),
    });

    useAgentBuilderAgentById.mockReturnValue({
      agent: {
        id: 'agent-1',
        name: 'Test Agent',
        configuration: { tools: [{ tool_ids: ['tool-1'] }] },
      },
      isLoading: false,
      error: null,
    });

    useCanUpdateAgent.mockReturnValue(true);

    useToolsService.mockReturnValue({
      tools: [{ id: 'tool-1', description: 'Tool 1', tags: [] }],
      isLoading: false,
    });

    useToolsMutation.mockReturnValue({
      handleAddTool: vi.fn(),
      handleRemoveTool: vi.fn(),
    });
  });

  it('renders the Add tool button', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'Add tool' })).toBeInTheDocument();
  });

  it('opens dropdown with two menu items when Add tool is clicked', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Add tool' }));

    expect(screen.getByText('Import from tool library')).toBeInTheDocument();
    expect(screen.getByText('Create a tool')).toBeInTheDocument();
  });

  it('opens library flyout when "Import from tool library" is clicked', async () => {
    const openFlyout = vi.fn();
    useFlyoutState.mockReturnValue({ isOpen: false, openFlyout, closeFlyout: vi.fn() });

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Add tool' }));
    await user.click(screen.getByText('Import from tool library'));

    expect(openFlyout).toHaveBeenCalledTimes(1);
  });

  it('opens the create tool flyout and closes the dropdown when "Create a tool" is clicked', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderComponent();

    expect(screen.queryByTestId('toolCreateFlyout')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add tool' }));
    expect(screen.getByText('Create a tool')).toBeInTheDocument();

    await user.click(screen.getByText('Create a tool'));

    await waitFor(() => expect(screen.queryByText('Create a tool')).not.toBeInTheDocument());
    expect(screen.getByTestId('toolCreateFlyout')).toBeInTheDocument();
  });

  it('selects the newly created tool immediately, without waiting for the attach mutation', async () => {
    const setSelectedToolId = vi.fn();
    useQueryState.mockReturnValue([undefined, setSelectedToolId]);

    const handleAddTool = vi.fn();
    useToolsMutation.mockReturnValue({ handleAddTool, handleRemoveTool: vi.fn() });

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Add tool' }));
    await user.click(screen.getByText('Create a tool'));
    await user.click(screen.getByRole('button', { name: 'Simulate tool created' }));

    expect(handleAddTool).toHaveBeenCalledWith({ id: 'new-tool' });
    // Selection must not depend on the attach mutation's onSuccess (a separate,
    // slower network round trip) — the tool is already reflected optimistically.
    expect(setSelectedToolId).toHaveBeenCalledWith('new-tool');
  });

  it('hides the Add tool button when canEditAgent is false', () => {
    useCanUpdateAgent.mockReturnValue(false);
    renderComponent();
    expect(screen.queryByRole('button', { name: 'Add tool' })).not.toBeInTheDocument();
  });
});
