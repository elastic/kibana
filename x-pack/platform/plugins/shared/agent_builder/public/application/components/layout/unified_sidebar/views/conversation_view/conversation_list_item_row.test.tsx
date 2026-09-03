/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { MemoryRouter } from '@kbn/shared-ux-router';
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

const renderRow = (permissions: Partial<ConversationPermissions>) => {
  render(
    <IntlProvider locale="en">
      <MemoryRouter>
        <ConversationListItemRow
          agentId="agent-1"
          conversationId={conversationId}
          title="My conversation"
          icon="comment"
          isActive={false}
          routeConversationId={conversationId}
          permissions={{
            rename: false,
            delete: false,
            update_access_control: false,
            ...permissions,
          }}
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

  it('offers rename and delete when both are permitted', () => {
    renderRow({ rename: true, delete: true });

    expect(
      screen.getByTestId(`agentBuilderSidebarConversationRename-${conversationId}`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`agentBuilderSidebarConversationDelete-${conversationId}`)
    ).toBeInTheDocument();
  });

  it('offers only the permitted action', () => {
    renderRow({ rename: true, delete: false });

    expect(
      screen.getByTestId(`agentBuilderSidebarConversationRename-${conversationId}`)
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(`agentBuilderSidebarConversationDelete-${conversationId}`)
    ).not.toBeInTheDocument();
  });

  it('hides rename and delete when neither is permitted, keeping converse-level actions', () => {
    renderRow({ rename: false, delete: false });

    expect(
      screen.queryByTestId(`agentBuilderSidebarConversationRename-${conversationId}`)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`agentBuilderSidebarConversationDelete-${conversationId}`)
    ).not.toBeInTheDocument();
    expect(screen.getByText('Mark as unread')).toBeInTheDocument();
    expect(screen.getByText('Pin')).toBeInTheDocument();
  });
});
