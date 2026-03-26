/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from '@kbn/shared-ux-router';

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: {} }),
}));

jest.mock('../../../hooks/use_navigation', () => ({
  useNavigation: () => ({ navigateToAgentBuilderUrl: jest.fn() }),
}));

jest.mock('../../../hooks/agents/use_agents', () => ({
  useAgentBuilderAgents: () => ({ isFetched: true, agents: [] }),
}));

jest.mock('../../../hooks/agents/use_validate_agent_id', () => ({
  useValidateAgentId: () => () => true,
}));

jest.mock('../../../hooks/use_last_agent_id', () => ({
  useLastAgentId: () => 'test-agent',
}));

jest.mock('../../../hooks/use_conversation_list', () => ({
  useConversationList: () => ({ conversations: [], isLoading: false, refresh: jest.fn() }),
}));

jest.mock('../../../hooks/use_feature_flags', () => ({
  useFeatureFlags: () => ({ experimental: false, connectors: false }),
}));

jest.mock('./shared/sidebar_header', () => ({
  SidebarHeader: () => null,
}));

jest.mock('react-use/lib/useLocalStorage', () => ({
  __esModule: true,
  default: () => [undefined, jest.fn()],
}));

import { UnifiedSidebar } from './unified_sidebar';

const renderSidebar = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <UnifiedSidebar isCondensed={false} onToggleCondensed={jest.fn()} />
    </MemoryRouter>
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

    it('renders for connectors route', () => {
      renderSidebar('/agents/my-agent/connectors');
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
