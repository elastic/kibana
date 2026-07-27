/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EmbeddableConversationList } from './embeddable_conversation_list';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useStreamingContext } from '../../../context/streaming/streaming_context';
import { useConversationList } from '../../../hooks/use_conversation_list';

jest.mock('../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));

jest.mock('../../../context/streaming/streaming_context', () => ({
  useStreamingContext: jest.fn(),
}));

jest.mock('../../../hooks/use_conversation_list', () => ({
  useConversationList: jest.fn(),
}));

// EUI useEuiTheme requires a theme provider; stub it out.
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: () => ({ euiTheme: actual.euiTheme ?? {} }),
  };
});

jest.mock('../conversation_list_item_styles', () => ({
  createConversationListItemStyles: () => ({}),
  createActiveConversationListItemStyles: () => ({}),
}));

const mockUseConversationContext = jest.mocked(useConversationContext);
const mockUseStreamingContext = jest.mocked(useStreamingContext);
const mockUseConversationList = jest.mocked(useConversationList);

const renderList = (props: { searchValue?: string; onClose?: () => void } = {}) => {
  return render(
    <IntlProvider locale="en">
      <EmbeddableConversationList
        searchValue={props.searchValue ?? ''}
        onClose={props.onClose ?? jest.fn()}
      />
    </IntlProvider>
  );
};

describe('EmbeddableConversationList', () => {
  let setConversationId: jest.Mock;
  let resetAttachments: jest.Mock;
  let removeAllErrors: jest.Mock;

  beforeEach(() => {
    setConversationId = jest.fn();
    resetAttachments = jest.fn();
    removeAllErrors = jest.fn();

    mockUseConversationContext.mockReturnValue({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      setConversationId,
      resetAttachments,
    } as unknown as ReturnType<typeof useConversationContext>);

    mockUseStreamingContext.mockReturnValue({
      removeAllErrors,
    } as unknown as ReturnType<typeof useStreamingContext>);

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
    } as unknown as ReturnType<typeof useConversationList>);
  });

  it('calls resetAttachments and setConversationId when selecting a different conversation', () => {
    const onClose = jest.fn();
    renderList({ onClose });

    fireEvent.click(screen.getByTestId('agentBuilderEmbeddableConversation-conv-2'));

    // Staged attachments must be cleared so stale drafts cannot leak across the switch
    expect(resetAttachments).toHaveBeenCalledTimes(1);
    expect(setConversationId).toHaveBeenCalledWith('conv-2');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(removeAllErrors).toHaveBeenCalledTimes(1);
  });

  it('does not call resetAttachments when re-clicking the currently active conversation', () => {
    const onClose = jest.fn();
    renderList({ onClose });

    fireEvent.click(screen.getByTestId('agentBuilderEmbeddableConversation-conv-1'));

    // The user's existing staged attachments should be preserved for their current conversation
    expect(resetAttachments).not.toHaveBeenCalled();
    expect(setConversationId).toHaveBeenCalledWith('conv-1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls removeAllErrors on every conversation click', () => {
    renderList();

    fireEvent.click(screen.getByTestId('agentBuilderEmbeddableConversation-conv-2'));
    fireEvent.click(screen.getByTestId('agentBuilderEmbeddableConversation-conv-1'));

    expect(removeAllErrors).toHaveBeenCalledTimes(2);
  });
});
