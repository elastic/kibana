/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EmbeddableConversationList } from './embeddable_conversation_list';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationList } from '../../../hooks/use_conversation_list';

vi.mock('../../../context/conversation/conversation_context', () => {
      const mocked = {
      useConversationContext: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_agent_builder_service', () => {
      const mocked = {
      useAgentBuilderServices: vi.fn(() => ({
        conversationTemplatesService: { getTemplateUIDefinition: vi.fn() },
      })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_conversation_list', () => {
      const mocked = {
      useConversationList: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

// EUI useEuiTheme requires a theme provider; stub it out.
vi.mock('@elastic/eui', async () => {
  const actual = (await vi.importActual('@elastic/eui'));
  return {
    ...actual,
    useEuiTheme: () => ({ euiTheme: actual.euiTheme ?? {} }),
  };
});

vi.mock('../conversation_list_item_styles', () => {
      const mocked = {
      createConversationListItemStyles: () => ({}),
      createActiveConversationListItemStyles: () => ({}),
    };
      return { ...mocked, default: mocked };
    });

const mockUseConversationContext = vi.mocked(useConversationContext);
const mockUseConversationList = vi.mocked(useConversationList);

const renderList = (props: { searchValue?: string; onClose?: () => void } = {}) => {
  return render(
    <IntlProvider locale="en">
      <EmbeddableConversationList
        searchValue={props.searchValue ?? ''}
        onClose={props.onClose ?? vi.fn()}
      />
    </IntlProvider>
  );
};

describe('EmbeddableConversationList', () => {
  let setConversationId: Mock;
  let resetAttachments: Mock;

  beforeEach(() => {
    setConversationId = vi.fn();
    resetAttachments = vi.fn();

    mockUseConversationContext.mockReturnValue({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      setConversationId,
      resetAttachments,
    } as unknown as ReturnType<typeof useConversationContext>);

    // `searchValue` defaults to '' in these tests, so `isSearching` is false and the
    // list conversations below are what gets rendered.
    mockUseConversationList.mockReturnValue({
      conversations: [
        {
          id: 'conv-1',
          title: 'Active conversation',
          agent_id: 'agent-1',
          updated_at: '2026-01-02T00:00:00Z',
        },
        {
          id: 'conv-2',
          title: 'Other conversation',
          agent_id: 'agent-1',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
      isLoading: false,
      isSearching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useConversationList>);
  });

  it('calls resetAttachments and setConversationId when selecting a different conversation', () => {
    const onClose = vi.fn();
    renderList({ onClose });

    fireEvent.click(screen.getByTestId('agentBuilderEmbeddableConversation-conv-2'));

    // Staged attachments must be cleared so stale drafts cannot leak across the switch
    expect(resetAttachments).toHaveBeenCalledTimes(1);
    expect(setConversationId).toHaveBeenCalledWith('conv-2');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call resetAttachments when re-clicking the currently active conversation', () => {
    const onClose = vi.fn();
    renderList({ onClose });

    fireEvent.click(screen.getByTestId('agentBuilderEmbeddableConversation-conv-1'));

    // The user's existing staged attachments should be preserved for their current conversation
    expect(resetAttachments).not.toHaveBeenCalled();
    expect(setConversationId).toHaveBeenCalledWith('conv-1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
