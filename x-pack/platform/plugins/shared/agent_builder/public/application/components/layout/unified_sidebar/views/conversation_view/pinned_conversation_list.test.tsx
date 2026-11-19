/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDragDropContext, EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import type { ListConversationsResponseItem } from '../../../../../../../common/http_api/conversations';
import { PinnedConversationList } from './pinned_conversation_list';

jest.mock('../../../../../hooks/use_infinite_scroll', () => ({
  useInfiniteScroll: () => null,
}));

jest.mock('./draggable_conversation_item', () => ({
  DraggableConversationItem: ({
    conversation,
    index,
  }: {
    conversation: ListConversationsResponseItem;
    index: number;
  }) => (
    <div data-test-subj="pinned-conversation" data-index={index}>
      {conversation.title}
    </div>
  ),
}));

const createConversation = (
  id: string,
  updatedAt: string,
  createdAt = '2026-11-17T10:00:00Z'
): ListConversationsResponseItem => ({
  id,
  agent_id: 'agent-1',
  title: id,
  user: { id: 'user-1', username: 'test-user' },
  created_at: createdAt,
  updated_at: updatedAt,
  pinned: true,
  permissions: { rename: true, delete: true, update_access_control: true },
});

const pinnedList = (conversations: ListConversationsResponseItem[]) => (
  <EuiProvider>
    <EuiDragDropContext onDragEnd={jest.fn()}>
      <PinnedConversationList
        agentId="agent-1"
        currentConversationId={undefined}
        pinnedConversations={conversations}
      />
    </EuiDragDropContext>
  </EuiProvider>
);

const renderedTitles = () =>
  screen.getAllByTestId('pinned-conversation').map((item) => item.textContent);

describe('PinnedConversationList', () => {
  it('keeps an older newly pinned chat below a newer one before and after refetch', () => {
    const newer = createConversation('newer', '2026-11-19T10:00:00Z');
    const older = createConversation('older', '2026-11-18T10:00:00Z');
    const { rerender } = render(pinnedList([newer]));
    const optimisticRows = [older, newer];

    rerender(pinnedList(optimisticRows));

    expect(renderedTitles()).toEqual(['newer', 'older']);
    expect(optimisticRows.map(({ id }) => id)).toEqual(['older', 'newer']);
    expect(
      screen.getAllByTestId('pinned-conversation').map((item) => item.getAttribute('data-index'))
    ).toEqual(['0', '1']);

    rerender(pinnedList([newer, older]));

    expect(renderedTitles()).toEqual(['newer', 'older']);
  });

  it('uses creation time descending to break ties in update time, matching the server', () => {
    const older = createConversation(
      'created-earlier',
      '2026-11-19T10:00:00Z',
      '2026-11-17T10:00:00Z'
    );
    const newer = createConversation(
      'created-later',
      '2026-11-19T11:00:00+01:00',
      '2026-11-18T10:00:00Z'
    );

    render(pinnedList([older, newer]));

    expect(renderedTitles()).toEqual(['created-later', 'created-earlier']);
  });
});
