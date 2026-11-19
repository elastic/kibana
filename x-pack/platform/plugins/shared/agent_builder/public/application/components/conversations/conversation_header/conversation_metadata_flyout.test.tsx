/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  AGENT_BUILDER_UI_EBT,
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  type Conversation,
} from '@kbn/agent-builder-common';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationPermissions } from '../../../hooks/use_conversation';
import { useConversationTemplateDisplay } from '../../../hooks/use_conversation_template_display';
import { useToasts } from '../../../hooks/use_toasts';
import { ConversationMetadataFlyout } from './conversation_metadata_flyout';

jest.mock('../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));

jest.mock('../../../hooks/use_conversation', () => ({
  useConversationPermissions: jest.fn(),
}));

jest.mock('../../../hooks/use_conversation_template_display', () => ({
  ...jest.requireActual('../../../hooks/use_conversation_template_display'),
  useConversationTemplateDisplay: jest.fn(),
}));

jest.mock('../../../hooks/use_toasts', () => ({
  useToasts: jest.fn(),
}));

jest.mock('../../../hooks/use_conversation_flyout_session_props', () => ({
  useConversationFlyoutSessionProps: () => ({}),
}));

const mockUseConversationContext = jest.mocked(useConversationContext);
const mockUseConversationPermissions = jest.mocked(useConversationPermissions);
const mockUseConversationTemplateDisplay = jest.mocked(useConversationTemplateDisplay);
const mockUseToasts = jest.mocked(useToasts);

const renameConversation = jest.fn();
const addErrorToast = jest.fn();

const baseConversation = {
  id: 'conversation-1',
  agent_id: 'agent-1',
  user: { id: 'owner-1', username: 'ethan' },
  title: 'Debugging high CPU usage',
  created_at: '2026-07-12T12:00:00.000Z',
  updated_at: '2026-07-15T12:00:00.000Z',
  rounds: [],
  access_control: {
    access_mode: ConversationAccessControlMode.Private,
    entries: [],
  },
} as unknown as Conversation;

const renderFlyout = ({
  conversation = baseConversation,
  canRename = true,
}: {
  conversation?: Conversation;
  canRename?: boolean;
} = {}) => {
  mockUseConversationPermissions.mockReturnValue({
    rename: canRename,
    delete: false,
    update_access_control: false,
  });

  return render(renderFlyoutTree(conversation));
};

const renderFlyoutTree = (conversation: Conversation) => (
  <EuiThemeProvider>
    <IntlProvider locale="en">
      <ConversationMetadataFlyout conversation={conversation} onClose={jest.fn()} />
    </IntlProvider>
  </EuiThemeProvider>
);

const editTitle = async (user: ReturnType<typeof userEvent.setup>, nextTitle: string) => {
  await user.click(screen.getByTestId('agentBuilderConversationMetadataTitle'));
  const input = screen.getByTestId('agentBuilderConversationMetadataTitleInput');
  await user.clear(input);
  if (nextTitle) {
    await user.type(input, nextTitle);
  }
  await user.click(screen.getByTestId('agentBuilderConversationMetadataTitleSave'));
};

describe('ConversationMetadataFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    renameConversation.mockResolvedValue(undefined);
    mockUseConversationContext.mockReturnValue({
      conversationActions: { renameConversation },
    } as never);
    mockUseConversationTemplateDisplay.mockReturnValue(undefined);
    mockUseToasts.mockReturnValue({ addErrorToast } as never);
  });

  it('lists the chat details for a private chat', () => {
    renderFlyout();

    expect(screen.getByRole('heading', { level: 3, name: 'Chat details' })).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderConversationMetadataTitle')).toHaveTextContent(
      'Debugging high CPU usage'
    );
    expect(screen.getByText('ethan')).toBeInTheDocument();
    expect(screen.getByText(/Jul 12, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Jul 15, 2026/)).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows dates in the timezone from the dateFormat:tz setting', () => {
    // Core applies `dateFormat:tz` as moment's default timezone; Jest's setup defaults it to New York.
    moment.tz.setDefault('Asia/Tokyo');
    try {
      renderFlyout();

      expect(screen.getByText('Jul 12, 2026 9:00 PM')).toBeInTheDocument();
      expect(screen.getByText('Jul 15, 2026 9:00 PM')).toBeInTheDocument();
    } finally {
      moment.tz.setDefault('America/New_York');
    }
  });

  it('shows the template name and the member count for a restricted chat', () => {
    mockUseConversationTemplateDisplay.mockReturnValue({ name: 'Incident', icon: 'bug' });
    renderFlyout({
      conversation: {
        ...baseConversation,
        access_control: {
          access_mode: ConversationAccessControlMode.Private,
          entries: [
            { type: 'user', id: 'member-1', role: ConversationAccessControlRole.Member },
            { type: 'user', id: 'member-2', role: ConversationAccessControlRole.Member },
          ],
        },
      } as unknown as Conversation,
    });

    expect(screen.getByText('Restricted')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Incident')).toBeInTheDocument();
  });

  it('hides the member count for a public chat', () => {
    renderFlyout({
      conversation: {
        ...baseConversation,
        access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
      } as unknown as Conversation,
    });

    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.queryByText('Members')).not.toBeInTheDocument();
  });

  it('renames the chat inline', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await editTitle(user, 'CPU spike on prod');

    expect(renameConversation).toHaveBeenCalledWith('conversation-1', 'CPU spike on prod');
    expect(
      screen.queryByTestId('agentBuilderConversationMetadataTitleInput')
    ).not.toBeInTheDocument();
  });

  it('keeps focus on the title after a rename updates the conversation', async () => {
    const user = userEvent.setup();
    const { rerender } = renderFlyout();
    renameConversation.mockImplementation(async (_id: string, title: string) => {
      rerender(renderFlyoutTree({ ...baseConversation, title }));
    });

    await editTitle(user, 'CPU spike on prod');

    const title = screen.getByTestId('agentBuilderConversationMetadataTitle');
    expect(title).toHaveTextContent('CPU spike on prod');
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('follows a title change made elsewhere', () => {
    const { rerender } = renderFlyout();

    rerender(renderFlyoutTree({ ...baseConversation, title: 'Renamed from the list' }));

    expect(screen.getByTestId('agentBuilderConversationMetadataTitle')).toHaveTextContent(
      'Renamed from the list'
    );
  });

  it('lets the title field be cleared', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.click(screen.getByTestId('agentBuilderConversationMetadataTitle'));
    await user.clear(screen.getByTestId('agentBuilderConversationMetadataTitleInput'));

    expect(screen.getByTestId('agentBuilderConversationMetadataTitleInput')).toHaveValue('');
  });

  it('restores the saved title when the edit is cancelled', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.click(screen.getByTestId('agentBuilderConversationMetadataTitle'));
    await user.type(screen.getByTestId('agentBuilderConversationMetadataTitleInput'), ' draft');
    await user.keyboard('{Escape}');

    expect(screen.getByTestId('agentBuilderConversationMetadataTitle')).toHaveTextContent(
      'Debugging high CPU usage'
    );
    expect(renameConversation).not.toHaveBeenCalled();
  });

  it('tracks rename clicks with the same telemetry as the rename modal', async () => {
    const user = userEvent.setup();
    renderFlyout();

    const title = screen.getByTestId('agentBuilderConversationMetadataTitle');
    expect(title).toHaveAttribute(
      'data-ebt-action',
      AGENT_BUILDER_UI_EBT.action.conversation.RENAME
    );
    expect(title).toHaveAttribute('data-ebt-element', AGENT_BUILDER_UI_EBT.element.pageContent);
    expect(title).toHaveAttribute('data-ebt-detail', 'conversation');

    await user.click(title);

    expect(screen.getByTestId('agentBuilderConversationMetadataTitleSave')).toHaveAttribute(
      'data-ebt-action',
      AGENT_BUILDER_UI_EBT.action.conversation.RENAME_SAVE
    );
    expect(screen.getByTestId('agentBuilderConversationMetadataTitleCancel')).toHaveAttribute(
      'data-ebt-action',
      AGENT_BUILDER_UI_EBT.action.conversation.RENAME_CANCEL
    );
  });

  it('keeps the editor open and saves nothing when the title is empty', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await editTitle(user, '');

    expect(renameConversation).not.toHaveBeenCalled();
    expect(screen.getByTestId('agentBuilderConversationMetadataTitleInput')).toBeInTheDocument();
  });

  it('shows an error toast and keeps the editor open when the rename fails', async () => {
    const user = userEvent.setup();
    renameConversation.mockRejectedValue(new Error('nope'));
    renderFlyout();

    await editTitle(user, 'CPU spike on prod');

    expect(addErrorToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Failed to rename chat' })
    );
    expect(screen.getByTestId('agentBuilderConversationMetadataTitleInput')).toBeInTheDocument();
  });

  it('shows the title read-only without rename permission', () => {
    renderFlyout({ canRename: false });

    expect(screen.getByTestId('agentBuilderConversationMetadataTitle')).toBeDisabled();
  });

  it('has no delete action', () => {
    renderFlyout();

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});
