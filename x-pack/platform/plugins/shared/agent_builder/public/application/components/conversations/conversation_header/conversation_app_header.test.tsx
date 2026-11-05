/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  type Conversation,
} from '@kbn/agent-builder-common';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import {
  useConversation,
  useConversationPermissions,
  useConversationReadOnly,
  useHasPersistedConversation,
} from '../../../hooks/use_conversation';
import { useConversationTemplateDisplay } from '../../../hooks/use_conversation_template_display';
import { useQueryState } from '../../../hooks/use_query_state';
import { useActivityLog } from '../activity_log/use_activity_log';
import { ConversationAppHeader } from './conversation_app_header';

jest.mock('../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));

jest.mock('../../../hooks/use_conversation', () => ({
  useConversation: jest.fn(),
  useConversationPermissions: jest.fn(),
  useConversationReadOnly: jest.fn(),
  useHasPersistedConversation: jest.fn(),
}));

jest.mock('../../../hooks/use_conversation_template_display', () => ({
  useConversationTemplateDisplay: jest.fn(),
}));

jest.mock('../../../hooks/use_query_state', () => ({
  useQueryState: jest.fn(),
}));

jest.mock('../../../hooks/use_download_conversation', () => ({
  useDownloadConversation: () => mockDownloadConversation,
}));

jest.mock('../activity_log/use_activity_log', () => ({
  useActivityLog: jest.fn(),
}));

jest.mock('./conversation_share_button', () => ({
  ConversationShareFlyout: ({ conversation }: { conversation: Conversation }) => {
    useEffect(() => mockShareFlyoutMounted(conversation.id), [conversation.id]);
    return <div data-test-subj="stubShareFlyout">{conversation.id}</div>;
  },
}));

jest.mock('./conversation_metadata_flyout', () => ({
  ConversationMetadataFlyout: ({ onClose }: { onClose: () => void }) => (
    <div data-test-subj="stubChatDetailsFlyout">
      <button type="button" onClick={onClose}>
        Close chat details
      </button>
    </div>
  ),
}));

jest.mock('../../../../flyout/conversation_details_flyout', () => ({
  ConversationDetailsFlyout: ({ onClose }: { onClose: () => void }) => (
    <div data-test-subj="stubSummaryFlyout">
      <button type="button" onClick={onClose}>
        Close summary
      </button>
    </div>
  ),
}));

jest.mock('../activity_log/activity_log_flyout', () => ({
  ActivityLogFlyout: () => <div data-test-subj="stubActivityLogFlyout" />,
}));

jest.mock('../delete_conversation_modal', () => ({
  DeleteConversationModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-test-subj="stubDeleteModal" /> : null,
}));

const mockDownloadConversation = jest.fn();
const mockShareFlyoutMounted = jest.fn();
const renameConversation = jest.fn();
const setSummaryParam = jest.fn();

const mockUseConversation = jest.mocked(useConversation);
const mockUseConversationPermissions = jest.mocked(useConversationPermissions);
const mockUseConversationReadOnly = jest.mocked(useConversationReadOnly);
const mockUseHasPersistedConversation = jest.mocked(useHasPersistedConversation);
const mockUseConversationTemplateDisplay = jest.mocked(useConversationTemplateDisplay);
const mockUseQueryState = jest.mocked(useQueryState);
const mockUseActivityLog = jest.mocked(useActivityLog);

const baseConversation = {
  id: 'conversation-1',
  agent_id: 'agent-1',
  user: { id: 'owner-1', username: 'ethan' },
  title: 'Suspicious auth activity overnight',
  created_at: '2026-07-12T12:00:00.000Z',
  updated_at: '2026-07-15T12:00:00.000Z',
  rounds: [],
  access_control: { access_mode: ConversationAccessControlMode.Private, entries: [] },
} as unknown as Conversation;

const permissions = { rename: true, delete: true, update_access_control: true };

// EUI disables pointer events on closed popover anchors; the app-menu test helper skips that check too.
const setUpUser = () => userEvent.setup({ pointerEventsCheck: 0 });

const setUp = ({
  conversation = baseConversation,
  isPersisted = true,
  isReadOnly = false,
  can = permissions,
  templateName,
  summaryParam = null,
  hasActivity = true,
}: {
  conversation?: Conversation | null;
  isPersisted?: boolean;
  isReadOnly?: boolean;
  can?: typeof permissions;
  templateName?: string;
  summaryParam?: string | null;
  hasActivity?: boolean;
} = {}) => {
  mockUseConversation.mockReturnValue({
    conversation: conversation ?? undefined,
    isLoading: false,
  } as never);
  mockUseHasPersistedConversation.mockReturnValue(isPersisted);
  mockUseConversationReadOnly.mockReturnValue({ isReadOnly, isLoading: false });
  mockUseConversationPermissions.mockReturnValue(can);
  mockUseConversationTemplateDisplay.mockReturnValue(
    templateName ? { name: templateName } : undefined
  );
  mockUseQueryState.mockReturnValue([summaryParam, setSummaryParam] as never);
  mockUseActivityLog.mockReturnValue({
    hasActivity,
    isOpen: false,
    open: jest.fn(),
    close: jest.fn(),
  });
};

const renderHeaderTree = () => (
  <EuiThemeProvider>
    <IntlProvider locale="en">
      <MockAppHeaderProvider>
        <ConversationAppHeader />
      </MockAppHeaderProvider>
    </IntlProvider>
  </EuiThemeProvider>
);

const renderHeader = () => render(renderHeaderTree());

describe('ConversationAppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    renameConversation.mockResolvedValue(undefined);
    jest.mocked(useConversationContext).mockReturnValue({
      conversationActions: { renameConversation },
    } as never);
  });

  it('shows only the "New chat" title for a chat that is not saved yet', () => {
    setUp({ conversation: null, isPersisted: false });
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('New chat');
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.badge)).not.toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderConversationShareButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderChatInfoButton')).not.toBeInTheDocument();
  });

  it('shows "New chat" for a saved chat that still has the default title', () => {
    setUp({ conversation: { ...baseConversation, title: 'New conversation' } as Conversation });
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('New chat');
  });

  it('shows the title, the visibility badge and Share for a saved chat', async () => {
    setUp();
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Suspicious auth activity overnight'
    );
    expect(screen.getByTestId('agentBuilderConversationVisibilityBadge')).toHaveTextContent(
      'Private'
    );
    expect(screen.queryByTestId('agentBuilderConversationTemplateBadge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderChatInfoButton')).not.toBeInTheDocument();
    // jsdom is narrow, so every menu item collapses into the overflow menu.
    await openAppMenuOverflow();
    expect(screen.getByTestId('agentBuilderConversationShareButton')).toHaveTextContent('Share');
  });

  it('lists the chat actions in the overflow menu, without loading a trace', async () => {
    setUp();
    renderHeader();

    await openAppMenuOverflow();

    expect(screen.getByTestId('agentBuilderConversationChatDetailsButton')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderActivityLogMenuItem')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderConversationDownloadButton')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderConversationDeleteButton')).toBeInTheDocument();
    expect(screen.queryByText('Load trace from file')).not.toBeInTheDocument();
  });

  it('hides Share and Delete without the permissions for them', async () => {
    setUp({ can: { rename: false, delete: false, update_access_control: false } });
    renderHeader();

    await openAppMenuOverflow();
    expect(screen.queryByTestId('agentBuilderConversationShareButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderConversationDeleteButton')).not.toBeInTheDocument();
  });

  it('shows Share to members of a chat shared with them', async () => {
    setUp({
      can: { rename: false, delete: false, update_access_control: false },
      conversation: {
        ...baseConversation,
        access_control: {
          access_mode: ConversationAccessControlMode.Private,
          entries: [{ type: 'user', id: 'member-1', role: ConversationAccessControlRole.Member }],
        },
      } as unknown as Conversation,
    });
    renderHeader();

    expect(screen.getByTestId('agentBuilderConversationVisibilityBadge')).toHaveTextContent(
      'Restricted'
    );
    await openAppMenuOverflow();
    expect(screen.getByTestId('agentBuilderConversationShareButton')).toBeInTheDocument();
  });

  it('shows the type badge and Summary for a typed chat', () => {
    setUp({
      templateName: 'Investigation',
      conversation: {
        ...baseConversation,
        template_id: 'investigation',
        access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
      } as unknown as Conversation,
    });
    renderHeader();

    expect(screen.getByTestId('agentBuilderConversationVisibilityBadge')).toHaveTextContent(
      'Public'
    );
    expect(screen.getByTestId('agentBuilderConversationTemplateBadge')).toHaveTextContent(
      'Investigation'
    );
    expect(screen.getByTestId('agentBuilderChatInfoButton')).toHaveTextContent('Summary');
  });

  it('hides Summary while the summary flyout is open', () => {
    setUp({
      templateName: 'Investigation',
      summaryParam: 'true',
      conversation: { ...baseConversation, template_id: 'investigation' } as Conversation,
    });
    renderHeader();

    expect(screen.getByTestId('stubSummaryFlyout')).toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderChatInfoButton')).not.toBeInTheDocument();
  });

  it('opens the summary flyout from Summary', async () => {
    const user = setUpUser();
    setUp({
      templateName: 'Investigation',
      conversation: { ...baseConversation, template_id: 'investigation' } as Conversation,
    });
    renderHeader();

    await user.click(screen.getByTestId('agentBuilderChatInfoButton'));

    expect(setSummaryParam).toHaveBeenCalledWith('true');
  });

  it('returns focus to the menu when the summary flyout closes', async () => {
    const user = setUpUser();
    const typedChat = { ...baseConversation, template_id: 'investigation' } as Conversation;
    setUp({ templateName: 'Investigation', conversation: typedChat });
    const { rerender } = renderHeader();
    await user.click(screen.getByTestId('agentBuilderChatInfoButton'));

    setUp({ templateName: 'Investigation', conversation: typedChat, summaryParam: 'true' });
    rerender(renderHeaderTree());
    await user.click(screen.getByRole('button', { name: 'Close summary' }));

    expect(setSummaryParam).toHaveBeenLastCalledWith(null);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('shows the read-only badge and a plain title on a read-only chat', () => {
    setUp({
      isReadOnly: true,
      can: { rename: false, delete: false, update_access_control: false },
    });
    renderHeader();

    expect(screen.getByTestId('agentBuilderConversationReadOnlyBadge')).toHaveTextContent(
      'Read-only'
    );
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.titleButton)).not.toBeInTheDocument();
  });

  it('renames the chat from the title', async () => {
    const user = setUpUser();
    setUp();
    renderHeader();

    await user.click(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.titleButton));
    // Edited the way the app header's own tests do it.
    const input = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.titleInput);
    fireEvent.change(input, { target: { value: 'CPU spike on prod' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(renameConversation).toHaveBeenCalledWith('conversation-1', 'CPU spike on prod')
    );
  });

  it('drops an unsaved title draft when switching chats', async () => {
    const user = setUpUser();
    setUp();
    const { rerender } = renderHeader();
    await user.click(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.titleButton));
    fireEvent.change(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.titleInput), {
      target: { value: 'Draft for the first chat' },
    });

    setUp({ conversation: { ...baseConversation, id: 'conversation-2', title: 'Second chat' } });
    rerender(renderHeaderTree());

    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.titleInput)).not.toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Second chat');
    expect(renameConversation).not.toHaveBeenCalled();
  });

  it('opens the sharing flyout from Share', async () => {
    const user = setUpUser();
    setUp();
    renderHeader();

    await openAppMenuOverflow(user);
    await user.click(screen.getByTestId('agentBuilderConversationShareButton'));

    expect(screen.getByTestId('stubShareFlyout')).toBeInTheDocument();
  });

  it('starts the sharing flyout fresh when switching chats with it open', async () => {
    const user = setUpUser();
    setUp();
    const { rerender } = renderHeader();
    await openAppMenuOverflow(user);
    await user.click(screen.getByTestId('agentBuilderConversationShareButton'));
    await waitFor(() =>
      expect(screen.queryByTestId('agentBuilderConversationDownloadButton')).not.toBeInTheDocument()
    );

    setUp({ conversation: { ...baseConversation, id: 'conversation-2' } });
    rerender(renderHeaderTree());

    expect(within(screen.getByTestId('stubShareFlyout')).getByText('conversation-2')).toBeTruthy();
    expect(mockShareFlyoutMounted.mock.calls).toEqual([['conversation-1'], ['conversation-2']]);
  });

  it.each([
    ['agentBuilderConversationChatDetailsButton', 'stubChatDetailsFlyout'],
    ['agentBuilderActivityLogMenuItem', 'stubActivityLogFlyout'],
    ['agentBuilderConversationDeleteButton', 'stubDeleteModal'],
  ])('opens the matching panel from %s', async (menuItem, panel) => {
    const user = setUpUser();
    setUp();
    renderHeader();

    await openAppMenuOverflow(user);
    await user.click(screen.getByTestId(menuItem));

    expect(screen.getByTestId(panel)).toBeInTheDocument();
  });

  it('keeps earlier flyouts open when another one opens, so EUI can stack them', async () => {
    const user = setUpUser();
    setUp();
    renderHeader();

    await openAppMenuOverflow(user);
    await user.click(screen.getByTestId('agentBuilderConversationChatDetailsButton'));
    await openAppMenuOverflow(user);
    await user.click(screen.getByTestId('agentBuilderActivityLogMenuItem'));
    await openAppMenuOverflow(user);
    await user.click(screen.getByTestId('agentBuilderConversationShareButton'));

    expect(screen.getByTestId('stubChatDetailsFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('stubActivityLogFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('stubShareFlyout')).toBeInTheDocument();
  });

  it('returns focus to the menu when a panel closes', async () => {
    const user = setUpUser();
    setUp();
    renderHeader();

    await openAppMenuOverflow(user);
    await user.click(screen.getByTestId('agentBuilderConversationChatDetailsButton'));
    await user.click(screen.getByRole('button', { name: 'Close chat details' }));

    expect(screen.queryByTestId('stubChatDetailsFlyout')).not.toBeInTheDocument();
    // The menu decides where focus lands (the item, or the "…" button once its popover is gone);
    // without returning focus it would drop to the page body.
    expect(document.activeElement).not.toBe(document.body);
  });

  it('downloads the chat from the overflow menu', async () => {
    const user = setUpUser();
    setUp();
    renderHeader();

    await openAppMenuOverflow(user);
    await user.click(screen.getByTestId('agentBuilderConversationDownloadButton'));

    expect(mockDownloadConversation).toHaveBeenCalled();
  });

  it('disables the activity log when nothing has been recorded', async () => {
    setUp({ hasActivity: false });
    renderHeader();

    await openAppMenuOverflow();

    expect(screen.getByTestId('agentBuilderActivityLogMenuItem')).toBeDisabled();
  });
});
