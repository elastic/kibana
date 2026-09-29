/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { AgentForm } from './agent_form';
import type { AgentEditState } from '../../../hooks/agents/use_agent_edit';

const mockSubmit = vi.fn();

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

vi.mock('../../../hooks/agents/use_agent_edit', () => {
  const mocked = {
    useAgentEdit: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

// The settings tab's AI indices section reads a ui setting this test's Kibana context does not
// provide. Off keeps the section out of the way; it has its own tests.
vi.mock('../../../hooks/use_is_context_engine_enabled', () => {
  const mocked = {
    useIsContextEngineEnabled: () => false,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_kibana', () => {
  const mocked = {
    useKibana: () => ({
      services: {
        uiSettings: { get: () => false },
        notifications: { toasts: { addSuccess: vi.fn(), addDanger: vi.fn() } },
        http: {},
        overlays: { openConfirm: vi.fn().mockResolvedValue(true) },
        application: { navigateToUrl: vi.fn() },
        appParams: { history: { replace: vi.fn(), push: vi.fn() } },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_navigation', () => {
  const mocked = {
    useNavigation: () => ({
      navigateToAgentBuilderUrl: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_agent_builder_service', () => {
  const mocked = {
    useAgentBuilderServices: () => ({
      docLinksService: { agentBuilderAgents: 'https://docs.example.com/agents' },
      agentService: { list: vi.fn().mockResolvedValue([]) },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_ui_privileges', () => {
  const mocked = {
    useUiPrivileges: () => ({ manageAgents: true, isAdmin: false }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/tools/use_tools', () => {
  const mocked = {
    useToolsService: () => ({ tools: [], isLoading: false, error: undefined }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_experimental_features', () => {
  const mocked = {
    useExperimentalFeatures: () => false,
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/unsaved-changes-prompt', () => {
  const mocked = {
    useUnsavedChangesPrompt: () => {},
  };
  return { ...mocked, default: mocked };
});

const { useAgentEdit } = await vi.importMock('../../../hooks/agents/use_agent_edit');

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
    vi.clearAllMocks();
    (useAgentEdit as Mock).mockImplementation(({ editingAgentId }: { editingAgentId?: string }) => {
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
    });
  });

  it('displays owner name in edit mode when agent has created_by with username', () => {
    (useAgentEdit as Mock).mockReturnValue({
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

    renderWithIntl(<AgentForm editingAgentId="test-agent-id" onDelete={vi.fn()} />);

    expect(screen.getByTestId('agentFormOwnerLabel')).toBeInTheDocument();
    expect(screen.getByText('Owner: test-owner')).toBeInTheDocument();
  });

  it('does not display owner label in edit mode when agent has no created_by username', () => {
    (useAgentEdit as Mock).mockReturnValue({
      state: editModeState,
      isLoading: false,
      isSubmitting: false,
      submit: mockSubmit,
      tools: [],
      skills: [],
      plugins: [],
      error: undefined,
    });

    renderWithIntl(<AgentForm editingAgentId="test-agent-id" onDelete={vi.fn()} />);

    expect(screen.queryByTestId('agentFormOwnerLabel')).not.toBeInTheDocument();
  });

  it('does not display owner label in create mode', () => {
    (useAgentEdit as Mock).mockReturnValue({
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
    (useAgentEdit as Mock).mockReturnValue({
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

    renderWithIntl(<AgentForm editingAgentId="test-agent-id" onDelete={vi.fn()} />);

    expect(screen.getByTestId('agentBuilderAgentPreconfiguredTypeBadge')).toBeInTheDocument();
  });

  it('does not display the Managed badge for a chat-type agent', () => {
    (useAgentEdit as Mock).mockReturnValue({
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

    renderWithIntl(<AgentForm editingAgentId="test-agent-id" onDelete={vi.fn()} />);

    expect(screen.queryByTestId('agentBuilderAgentPreconfiguredTypeBadge')).not.toBeInTheDocument();
  });
});
