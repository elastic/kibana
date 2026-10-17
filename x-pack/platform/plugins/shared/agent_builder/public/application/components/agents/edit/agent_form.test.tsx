/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { AgentForm } from './agent_form';
import type { AgentEditState } from '../../../hooks/agents/use_agent_edit';

const mockSubmit = jest.fn();

const editModeState: AgentEditState = {
  id: 'test-agent-id',
  name: 'Test Agent',
  description: 'Test description',
  access_control: { access_mode: AgentAccessControlMode.Public, entries: [] },
  labels: [],
  avatar_color: '',
  avatar_symbol: '',
  configuration: {
    instructions: '',
    tools: [{ tool_ids: [] }],
    workflow_ids: [],
  },
};

/** State used for create mode (no editingAgentId): empty id, name, description */
const createModeState: AgentEditState = {
  ...editModeState,
  id: '',
  name: '',
  description: '',
};

jest.mock('../../../hooks/agents/use_agent_edit', () => ({
  useAgentEdit: jest.fn(),
}));

// The settings tab's AI indices section reads a ui setting this test's Kibana context does not
// provide. Off keeps the section out of the way; it has its own tests.
jest.mock('../../../hooks/use_is_context_engine_enabled', () => ({
  useIsContextEngineEnabled: () => false,
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      uiSettings: { get: () => false },
      notifications: { toasts: { addSuccess: jest.fn(), addDanger: jest.fn() } },
      http: {},
      overlays: { openConfirm: jest.fn().mockResolvedValue(true) },
      application: { navigateToUrl: jest.fn() },
      appParams: { history: { replace: jest.fn(), push: jest.fn() } },
    },
  }),
}));

jest.mock('../../../hooks/use_navigation', () => ({
  useNavigation: () => ({
    navigateToAgentBuilderUrl: jest.fn(),
    createAgentBuilderUrl: jest.fn(() => ''),
  }),
}));

jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    docLinksService: { agentBuilderAgents: 'https://docs.example.com/agents' },
    agentService: { list: jest.fn().mockResolvedValue([]) },
  }),
}));

jest.mock('../../../hooks/use_ui_privileges', () => ({
  useUiPrivileges: () => ({ manageAgents: true, isAdmin: false }),
}));

jest.mock('../../../hooks/tools/use_tools', () => ({
  useToolsService: () => ({ tools: [], isLoading: false, error: undefined }),
}));

jest.mock('../../../hooks/use_experimental_features', () => ({
  useExperimentalFeatures: () => false,
}));

jest.mock('@kbn/unsaved-changes-prompt', () => ({
  useUnsavedChangesPrompt: () => {},
}));

jest.mock('../../../hooks/skills/use_inherited_skill_ids', () => ({
  useInheritedSkillIds: jest.fn(),
}));

const { useAgentEdit } = jest.requireMock('../../../hooks/agents/use_agent_edit');
const { useInheritedSkillIds } = jest.requireMock('../../../hooks/skills/use_inherited_skill_ids');

const renderWithIntl = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en">{ui}</IntlProvider>
    </QueryClientProvider>
  );
};

describe('AgentForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useInheritedSkillIds as jest.Mock).mockReturnValue({
      inheritedSkillIds: new Set(),
      isLoading: false,
    });
    (useAgentEdit as jest.Mock).mockImplementation(
      ({ editingAgentId }: { editingAgentId?: string }) => {
        const state: AgentEditState = !editingAgentId ? createModeState : { ...editModeState };
        return {
          state,
          isLoading: false,
          isSubmitting: false,
          submit: mockSubmit,
          tools: [],
          skills: [],
          plugins: [],
          error: undefined,
        };
      }
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('displays owner name in edit mode when agent has created_by with username', () => {
    (useAgentEdit as jest.Mock).mockReturnValue({
      state: {
        ...editModeState,
        created_by: { id: 'user-1', username: 'test-owner' },
      },
      isLoading: false,
      isSubmitting: false,
      submit: mockSubmit,
      tools: [],
      skills: [],
      plugins: [],
      error: undefined,
    });

    renderWithIntl(<AgentForm editingAgentId="test-agent-id" onDelete={jest.fn()} />);

    expect(screen.getByTestId('agentFormOwnerLabel')).toBeInTheDocument();
    expect(screen.getByText('Owner: test-owner')).toBeInTheDocument();
  });

  it('does not display owner label in edit mode when agent has no created_by username', () => {
    (useAgentEdit as jest.Mock).mockReturnValue({
      state: editModeState,
      isLoading: false,
      isSubmitting: false,
      submit: mockSubmit,
      tools: [],
      skills: [],
      plugins: [],
      error: undefined,
    });

    renderWithIntl(<AgentForm editingAgentId="test-agent-id" onDelete={jest.fn()} />);

    expect(screen.queryByTestId('agentFormOwnerLabel')).not.toBeInTheDocument();
  });

  it('does not display owner label in create mode', () => {
    (useAgentEdit as jest.Mock).mockReturnValue({
      state: {
        ...createModeState,
        created_by: { id: 'user-1', username: 'current-user' },
      },
      isLoading: false,
      isSubmitting: false,
      submit: mockSubmit,
      tools: [],
      skills: [],
      plugins: [],
      error: undefined,
    });

    renderWithIntl(<AgentForm />);

    expect(screen.queryByTestId('agentFormOwnerLabel')).not.toBeInTheDocument();
  });

  it('displays the Managed badge in edit mode when the agent has a non-chat type', () => {
    (useAgentEdit as jest.Mock).mockReturnValue({
      state: editModeState,
      agentType: 'platform.nightshift.investigation-type',
      isLoading: false,
      isSubmitting: false,
      submit: mockSubmit,
      tools: [],
      skills: [],
      plugins: [],
      error: undefined,
    });

    renderWithIntl(<AgentForm editingAgentId="test-agent-id" onDelete={jest.fn()} />);

    expect(screen.getByTestId('agentBuilderAgentPreconfiguredTypeBadge')).toBeInTheDocument();
  });

  it('does not display the Managed badge for a chat-type agent', () => {
    (useAgentEdit as jest.Mock).mockReturnValue({
      state: editModeState,
      agentType: 'chat',
      isLoading: false,
      isSubmitting: false,
      submit: mockSubmit,
      tools: [],
      skills: [],
      plugins: [],
      error: undefined,
    });

    renderWithIntl(<AgentForm editingAgentId="test-agent-id" onDelete={jest.fn()} />);

    expect(screen.queryByTestId('agentBuilderAgentPreconfiguredTypeBadge')).not.toBeInTheDocument();
  });

  const mockAgentInheritingKiRetrieval = () => {
    const kiRetrieval = {
      id: 'ki-retrieval',
      name: 'ki-retrieval',
      description: 'Retrieve context from a Context Engine AI Index.',
      tool_ids: [],
      readonly: true,
    };
    (useAgentEdit as jest.Mock).mockReturnValue({
      state: editModeState,
      isLoading: false,
      isSubmitting: false,
      submit: mockSubmit,
      tools: [],
      skills: [kiRetrieval],
      plugins: [],
      error: undefined,
    });
    (useInheritedSkillIds as jest.Mock).mockReturnValue({
      inheritedSkillIds: new Set([kiRetrieval.id]),
      isLoading: false,
    });
  };

  it("counts a skill inherited from the agent's type in edit mode", () => {
    mockAgentInheritingKiRetrieval();

    renderWithIntl(<AgentForm editingAgentId="test-agent-id" onDelete={jest.fn()} />);

    expect(useInheritedSkillIds).toHaveBeenCalledWith('test-agent-id');
    expect(screen.getByRole('tab', { name: /Skills/ })).toHaveTextContent('1');
  });

  it('shows no tooltip on an inherited skill when Elastic Capabilities is off', () => {
    jest.useFakeTimers();
    mockAgentInheritingKiRetrieval();

    renderWithIntl(<AgentForm editingAgentId="test-agent-id" onDelete={jest.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: /Skills/ }));
    const checkbox = screen.getByRole('checkbox');
    fireEvent.mouseOver(checkbox);
    // Let the tooltip's show delay elapse instead of polling for it.
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
