/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import '@testing-library/jest-dom';
import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from '@kbn/shared-ux-router';

vi.mock('../../../hooks/use_kibana', () => {
  const mocked = {
    useKibana: () => ({ services: {} }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_navigation', () => {
  const mocked = {
    useNavigation: () => ({ navigateToAgentBuilderUrl: vi.fn() }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/agents/use_agents', () => {
  const mocked = {
    useAgentBuilderAgents: () => ({ isFetched: true, agents: [] }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/agents/use_validate_agent_id', () => {
  const mocked = {
    useValidateAgentId: () => () => true,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_last_agent_id', () => {
  const mocked = {
    useLastAgentId: () => 'test-agent',
    getLastAgentId: () => 'test-agent',
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../context/active_space_context', () => {
  const mocked = {
    useActiveSpaceId: () => 'default',
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_conversation_list', () => {
  const mocked = {
    useConversationList: () => ({ conversations: [], isLoading: false, refresh: vi.fn() }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_route_access_config', () => {
  const mocked = {
    useRouteAccessConfig: () => ({
      featureFlags: { experimental: false },
      capabilities: { isUIAMEnabled: false },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./shared/sidebar_header', () => {
  const mocked = {
    SidebarHeader: () => null,
  };
  return { ...mocked, default: mocked };
});

vi.mock('react-use/lib/useLocalStorage', () => ({
  __esModule: true,
  default: () => [undefined, vi.fn()],
}));

vi.mock('../../../context/streaming/streaming_context', () => {
  const mocked = {
    useStreamingContext: () => ({
      activeStreams: new Set(),
      byConversationId: {},
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_conversation_list_mutations', () => {
  const mocked = {
    useConversationListMutations: () => ({
      deleteConversation: vi.fn(),
      renameConversation: vi.fn(),
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAsPinned: vi.fn(),
      markAsUnpinned: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

import { UnifiedSidebar } from './unified_sidebar';

const renderSidebar = (path: string) =>
  render(
    <EuiProvider>
      <MemoryRouter initialEntries={[path]}>
        <UnifiedSidebar isCondensed={false} onToggleCondensed={vi.fn()} />
      </MemoryRouter>
    </EuiProvider>
  );

describe('UnifiedSidebar', () => {
  describe('conversation sidebar', () => {
    it('renders for agent root route', () => {
      renderSidebar('/agents/my-agent');
      expect(screen.getByTestId('agentBuilderSidebar-conversation')).toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderSidebar-manage')).not.toBeInTheDocument();
    });

    it('renders for conversation route', () => {
      renderSidebar('/agents/my-agent/conversations/abc-123');
      expect(screen.getByTestId('agentBuilderSidebar-conversation')).toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderSidebar-manage')).not.toBeInTheDocument();
    });

    it('renders for overview route', () => {
      renderSidebar('/agents/my-agent/overview');
      expect(screen.getByTestId('agentBuilderSidebar-conversation')).toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderSidebar-manage')).not.toBeInTheDocument();
    });

    it('renders for skills route', () => {
      renderSidebar('/agents/my-agent/skills');
      expect(screen.getByTestId('agentBuilderSidebar-conversation')).toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderSidebar-manage')).not.toBeInTheDocument();
    });

    it('renders for plugins route', () => {
      renderSidebar('/agents/my-agent/plugins');
      expect(screen.getByTestId('agentBuilderSidebar-conversation')).toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderSidebar-manage')).not.toBeInTheDocument();
    });
  });

  describe('manage sidebar', () => {
    it('renders for manage agents route', () => {
      renderSidebar('/manage/agents');
      expect(screen.getByTestId('agentBuilderSidebar-manage')).toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderSidebar-conversation')).not.toBeInTheDocument();
    });

    it('renders for manage tools route', () => {
      renderSidebar('/manage/tools');
      expect(screen.getByTestId('agentBuilderSidebar-manage')).toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderSidebar-conversation')).not.toBeInTheDocument();
    });

    it('renders for manage skills route', () => {
      renderSidebar('/manage/skills');
      expect(screen.getByTestId('agentBuilderSidebar-manage')).toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderSidebar-conversation')).not.toBeInTheDocument();
    });

    it('renders for manage plugins route', () => {
      renderSidebar('/manage/plugins');
      expect(screen.getByTestId('agentBuilderSidebar-manage')).toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderSidebar-conversation')).not.toBeInTheDocument();
    });

    it('renders for manage connectors route', () => {
      renderSidebar('/manage/connectors');
      expect(screen.getByTestId('agentBuilderSidebar-manage')).toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderSidebar-conversation')).not.toBeInTheDocument();
    });
  });
});
