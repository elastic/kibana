/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom-v5-compat';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ConversationPermissions } from '../../../../../../../common/http_api/conversations';
import { useConversationListMutations } from '../../../../../hooks/use_conversation_list_mutations';
import { ConversationListItemRow } from './conversation_list_item_row';

jest.mock('../../../../../hooks/use_conversation_list_mutations', () => ({
  useConversationListMutations: jest.fn(),
}));

jest.mock('../../../../../hooks/use_toasts', () => ({
  useToasts: () => ({ addSuccessToast: jest.fn(), addErrorToast: jest.fn() }),
}));

const mockUseConversationListMutations = jest.mocked(useConversationListMutations);

const conversationId = 'conversation-1';

const renderRow = (permissions?: ConversationPermissions) => {
  render(
    <IntlProvider locale="en">
      <MemoryRouter>
        <ConversationListItemRow
          agentId="agent-1"
          conversationId={conversationId}
          title="My conversation"
          isActive={false}
          routeConversationId={conversationId}
          permissions={permissions}
        />
      </MemoryRouter>
    </IntlProvider>
  );

  fireEvent.click(screen.getByTestId(`agentBuilderSidebarConversationMenu-${conversationId}`));
};

describe('ConversationListItemRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseConversationListMutations.mockReturnValue({
      deleteConversation: jest.fn(),
      renameConversation: jest.fn(),
      markAsRead: jest.fn(),
      markAsUnread: jest.fn(),
    } as unknown as ReturnType<typeof useConversationListMutations>);
  });

  it('enables rename and delete for the conversation owner', () => {
    renderRow({ rename_conversation: true, delete_conversation: true });

    expect(
      screen.getByTestId(`agentBuilderSidebarConversationRename-${conversationId}`)
    ).toBeEnabled();
    expect(
      screen.getByTestId(`agentBuilderSidebarConversationDelete-${conversationId}`)
    ).toBeEnabled();
  });

  it('disables rename and delete when the user is not the owner', () => {
    renderRow({ rename_conversation: false, delete_conversation: false });

    expect(
      screen.getByTestId(`agentBuilderSidebarConversationRename-${conversationId}`)
    ).toBeDisabled();
    expect(
      screen.getByTestId(`agentBuilderSidebarConversationDelete-${conversationId}`)
    ).toBeDisabled();
  });

  it('denies rename and delete when permissions are absent', () => {
    renderRow();

    expect(
      screen.getByTestId(`agentBuilderSidebarConversationRename-${conversationId}`)
    ).toBeDisabled();
    expect(
      screen.getByTestId(`agentBuilderSidebarConversationDelete-${conversationId}`)
    ).toBeDisabled();
  });

  it('leaves mark as read available to participants', () => {
    renderRow({ rename_conversation: false, delete_conversation: false });

    expect(screen.getByText('Mark as unread')).toBeEnabled();
  });

  it('explains why delete is unavailable', async () => {
    renderRow({ rename_conversation: false, delete_conversation: false });

    fireEvent.mouseOver(
      screen.getByTestId(`agentBuilderSidebarConversationDelete-${conversationId}`)
    );

    expect(
      await screen.findByText('Only the conversation owner can delete it.')
    ).toBeInTheDocument();
  });
});
