/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { ConversationDisplayStatus } from '@kbn/agent-builder-common';
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

const renderRow = (
  permissions: Partial<ConversationPermissions>,
  {
    status,
    read,
    openMenu = true,
  }: { status?: ConversationDisplayStatus; read?: boolean; openMenu?: boolean } = {}
) => {
  render(
    <IntlProvider locale="en">
      <MemoryRouter>
        <ConversationListItemRow
          agentId="agent-1"
          conversationId={conversationId}
          title="My conversation"
          isActive={false}
          routeConversationId={conversationId}
          status={status}
          read={read}
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

  if (openMenu) {
    fireEvent.click(screen.getByTestId(`agentBuilderSidebarConversationMenu-${conversationId}`));
  }
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

  it('shows the status icon on the left of the title, inside the link', () => {
    renderRow({}, { status: ConversationDisplayStatus.unread, openMenu: false });

    const link = screen.getByTestId(`agentBuilderSidebarConversation-${conversationId}`);
    const statusIcon = within(link).getByText('New');
    const title = within(link).getByText('My conversation');

    expect(
      statusIcon.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('renders no status icon when the conversation has no status', () => {
    renderRow({}, { openMenu: false });

    const link = screen.getByTestId(`agentBuilderSidebarConversation-${conversationId}`);

    expect(
      within(link).queryByText(/^(New|Working|Waiting for input|Error)$/)
    ).not.toBeInTheDocument();
  });

  describe('actions menu', () => {
    const isBefore = (first: HTMLElement, second: HTMLElement) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

    const iconOf = (label: string) =>
      screen
        .getByText(label)
        .closest('button')
        ?.querySelector('[data-euiicon-type]')
        ?.getAttribute('data-euiicon-type');

    it('lists Pin, Rename and the read action, then Delete after a separator', () => {
      renderRow({ rename: true, delete: true });

      const pin = screen.getByText('Pin');
      const rename = screen.getByText('Rename');
      const readAction = screen.getByText('Mark as unread');
      const separator = screen.getByRole('separator');
      const deleteAction = screen.getByText('Delete');

      expect(isBefore(pin, rename)).toBe(true);
      expect(isBefore(rename, readAction)).toBe(true);
      expect(isBefore(readAction, separator)).toBe(true);
      expect(isBefore(separator, deleteAction)).toBe(true);
    });

    it('omits the separator when delete is not permitted', () => {
      renderRow({ rename: true, delete: false });

      expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    });

    it('uses the eye icon for Mark as read', () => {
      renderRow({}, { read: false });

      expect(iconOf('Mark as read')).toBe('eye');
    });

    it('uses the crossed-out eye icon for Mark as unread', () => {
      renderRow({}, { read: true });

      expect(iconOf('Mark as unread')).toBe('eyeSlash');
    });
  });
});
