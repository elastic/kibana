/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import { RoutedConversationsProvider } from './routed_conversations_provider';
import { useConversationContext } from './conversation_context';

const mockUseParams = jest.fn();
const mockUseLocation = jest.fn();

jest.mock('react-router-dom', () => ({
  useParams: () => mockUseParams(),
  useLocation: () => mockUseLocation(),
}));

jest.mock('@kbn/react-query', () => ({
  useQueryClient: jest.fn(() => ({})),
}));

jest.mock('../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: jest.fn(() => ({
    conversationsService: {},
  })),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: jest.fn(() => ({
    services: { analytics: { reportEvent: jest.fn() } },
  })),
}));

jest.mock('../../hooks/use_navigation', () => ({
  useNavigation: jest.fn(() => ({
    navigateToAgentBuilderUrl: jest.fn(),
  })),
}));

jest.mock('./use_conversation_actions', () => ({
  useConversationActions: jest.fn(() => ({})),
}));

jest.mock('./conversation_change_notifier', () => ({
  ConversationChangeNotifier: () => null,
}));

const createMockAttachment = (): ConversationAttachment => ({
  type: 'test.attachment',
  data: { content: 'test' },
});

interface ContextCapture {
  attachments: ConversationAttachment[] | undefined;
  upsertAttachments: ((a: ConversationAttachment[]) => void) | undefined;
}

const ContextReader: React.FC<{ capture: ContextCapture }> = ({ capture }) => {
  const ctx = useConversationContext();
  capture.attachments = ctx.attachments;
  capture.upsertAttachments = ctx.upsertAttachments;
  return null;
};

describe('RoutedConversationsProvider — attachment lifecycle', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ conversationId: 'conv-1', agentId: 'agent-1' });
    mockUseLocation.mockReturnValue({ state: {} });
  });

  it('preserves attachments set after initial mount (skip-on-mount guard)', async () => {
    // The conversationId effect must NOT fire on initial mount to avoid racing with child
    // effects (e.g. stale-attachments restoration in conversation.tsx) that populate
    // attachments during the same render cycle.
    const capture: ContextCapture = { attachments: undefined, upsertAttachments: undefined };

    render(
      <RoutedConversationsProvider>
        <ContextReader capture={capture} />
      </RoutedConversationsProvider>
    );

    await act(async () => {});

    // Simulate a child effect populating attachments on mount
    act(() => {
      capture.upsertAttachments?.([createMockAttachment()]);
    });

    expect(capture.attachments).toHaveLength(1);
  });

  it('clears attachments when navigating to a different conversation', async () => {
    const capture: ContextCapture = { attachments: undefined, upsertAttachments: undefined };

    const { rerender } = render(
      <RoutedConversationsProvider>
        <ContextReader capture={capture} />
      </RoutedConversationsProvider>
    );

    await act(async () => {});

    act(() => {
      capture.upsertAttachments?.([createMockAttachment()]);
    });

    expect(capture.attachments).toHaveLength(1);

    // Simulate navigation to a different conversation
    mockUseParams.mockReturnValue({ conversationId: 'conv-2', agentId: 'agent-1' });
    rerender(
      <RoutedConversationsProvider>
        <ContextReader capture={capture} />
      </RoutedConversationsProvider>
    );

    // Staged attachments from conv-1 must not leak into conv-2
    expect(capture.attachments).toBeUndefined();
  });
});
