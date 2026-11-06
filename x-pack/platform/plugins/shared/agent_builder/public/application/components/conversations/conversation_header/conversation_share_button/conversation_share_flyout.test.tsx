/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
} from '@kbn/agent-builder-common';
import type { ConversationWithPermissions } from '../../../../../../common/http_api/conversations';
import { useConversationPermissions } from '../../../../hooks/use_conversation';
import { useSuggestUsers } from '../../../../hooks/use_suggest_users';
import { useUpdateConversationAccessControl } from '../../../../hooks/use_conversation_access_control';
import { useUserProfiles } from '../../../../hooks/use_user_profiles';
import { useAgentBuilderAgentById } from '../../../../hooks/agents/use_agent_by_id';
import { ConversationShareFlyout } from './conversation_share_flyout';

jest.mock('../../../../hooks/use_conversation', () => ({
  useConversationPermissions: jest.fn(),
}));

jest.mock('../../../../hooks/use_suggest_users', () => ({
  useSuggestUsers: jest.fn(),
}));

jest.mock('../../../../hooks/use_conversation_access_control', () => ({
  useUpdateConversationAccessControl: jest.fn(),
}));

jest.mock('../../../../hooks/use_user_profiles', () => ({
  useUserProfiles: jest.fn(),
}));

jest.mock('../../../../hooks/agents/use_agent_by_id', () => ({
  useAgentBuilderAgentById: jest.fn(() => ({ agent: null, isLoading: false, error: null })),
}));

jest.mock('../../../../hooks/use_conversation_flyout_session_props', () => ({
  useConversationFlyoutSessionProps: () => ({}),
}));

const mockUseConversationPermissions = jest.mocked(useConversationPermissions);
const mockUseSuggestUsers = jest.mocked(useSuggestUsers);
const mockUseUpdateConversationAccessControl = jest.mocked(useUpdateConversationAccessControl);
const mockUseUserProfiles = jest.mocked(useUserProfiles);
const mockUseAgentBuilderAgentById = jest.mocked(useAgentBuilderAgentById);

const mutate = jest.fn();
const onClose = jest.fn();
let updateOptions: Parameters<typeof useUpdateConversationAccessControl>[0];

const ownerProfile = {
  uid: 'owner-1',
  user: { username: 'ethan', full_name: 'Ethan Smith' },
  data: {},
  enabled: true,
};

const memberProfile = {
  uid: 'member-1',
  user: { username: 'alex', full_name: 'Alex Kim' },
  data: {},
  enabled: true,
};

const secondMemberProfile = {
  uid: 'member-2',
  user: { username: 'sam', full_name: 'Sam Delacroix' },
  data: {},
  enabled: true,
};

const thirdMemberProfile = {
  uid: 'member-3',
  user: { username: 'yuki', full_name: 'Yuki Tanaka' },
  data: {},
  enabled: true,
};

const baseConversation = {
  id: 'conversation-1',
  agent_id: 'agent-1',
  user: { id: 'owner-1', username: 'ethan' },
  title: 'My conversation',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  rounds: [],
  access_control: {
    access_mode: ConversationAccessControlMode.Private,
    entries: [],
  },
  permissions: {
    rename: false,
    delete: false,
    update_access_control: true,
  },
} as unknown as ConversationWithPermissions;

const renderShareFlyout = ({
  conversation = baseConversation,
  canUpdateAccessControl = true,
  suggestedProfiles = [],
}: {
  conversation?: ConversationWithPermissions;
  canUpdateAccessControl?: boolean;
  suggestedProfiles?: Array<typeof memberProfile>;
} = {}) => {
  mockUseConversationPermissions.mockReturnValue({
    rename: false,
    delete: false,
    update_access_control: canUpdateAccessControl,
  });
  mockUseSuggestUsers.mockReturnValue({ data: suggestedProfiles, isFetching: false } as never);
  mockUseUserProfiles.mockReturnValue({
    data: [ownerProfile, memberProfile, secondMemberProfile, thirdMemberProfile],
  } as never);
  mockUseUpdateConversationAccessControl.mockImplementation((options) => {
    updateOptions = options;
    return { mutate, isLoading: false } as never;
  });

  return render(
    <EuiThemeProvider>
      <IntlProvider locale="en">
        <ConversationShareFlyout conversation={conversation} onClose={onClose} />
      </IntlProvider>
    </EuiThemeProvider>
  );
};

describe('ConversationShareFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentBuilderAgentById.mockReturnValue({
      agent: null,
      isLoading: false,
      error: null,
    } as never);
  });

  it('shows a read-only member list without access-control update permission', async () => {
    renderShareFlyout({
      canUpdateAccessControl: false,
      conversation: {
        ...baseConversation,
        access_control: {
          access_mode: ConversationAccessControlMode.Private,
          entries: [
            {
              type: 'user',
              id: 'member-1',
              role: ConversationAccessControlRole.Member,
              added_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      },
    });

    expect(screen.getByTestId('agentBuilderConversationSharingFlyout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In this chat (2)' })).toBeInTheDocument();
    expect(
      screen.queryByTestId('agentBuilderConversationSharingInviteSection')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Ethan Smith')).toBeInTheDocument();
    expect(screen.getByText('Alex Kim')).toBeInTheDocument();
    expect(
      screen.queryByTestId('agentBuilderConversationSharingAccessModeSelect')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('agentBuilderConversationSharingUserSearch')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('agentBuilderConversationShareRemoveMember')
    ).not.toBeInTheDocument();
  });

  it('shows the invite and users sections', async () => {
    renderShareFlyout({
      conversation: {
        ...baseConversation,
        access_control: {
          access_mode: ConversationAccessControlMode.Private,
          entries: [
            {
              type: 'user',
              id: 'member-1',
              role: ConversationAccessControlRole.Member,
              added_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      },
    });

    expect(screen.getByTestId('agentBuilderConversationSharingFlyout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Share this chat' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'General access' })).toBeInTheDocument();
    expect(
      screen.getByTestId('agentBuilderConversationSharingAccessModeSelect')
    ).toHaveAccessibleName(expect.stringContaining('General access'));
    expect(screen.getByRole('heading', { name: 'Invite users' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In this chat (2)' })).toBeInTheDocument();
    expect(screen.getByText('Ethan Smith')).toBeInTheDocument();
    expect(screen.getByText('Alex Kim')).toBeInTheDocument();
    expect(screen.getByText('Author')).toBeInTheDocument();
    expect(screen.queryByText('Member')).not.toBeInTheDocument();
    expect(screen.getByText('Only manually added members can see this chat')).toBeInTheDocument();
  });

  it('orders current members alphabetically by display name', async () => {
    renderShareFlyout({
      conversation: {
        ...baseConversation,
        access_control: {
          access_mode: ConversationAccessControlMode.Private,
          entries: [
            {
              type: 'user',
              id: 'member-3',
              role: ConversationAccessControlRole.Member,
              added_at: '2026-01-03T00:00:00.000Z',
            },
            {
              type: 'user',
              id: 'member-1',
              role: ConversationAccessControlRole.Member,
              added_at: '2026-01-01T00:00:00.000Z',
            },
            {
              type: 'user',
              id: 'member-2',
              role: ConversationAccessControlRole.Member,
              added_at: '2026-01-02T00:00:00.000Z',
            },
          ],
        },
      },
    });

    expect(
      screen.getAllByTestId('agentBuilderConversationShareMemberRow').map((row) => row.textContent)
    ).toEqual([
      expect.stringContaining('Ethan Smith'),
      expect.stringContaining('Alex Kim'),
      expect.stringContaining('Sam Delacroix'),
      expect.stringContaining('Yuki Tanaka'),
    ]);
  });

  it('shows the author in the sharing flyout before anyone is invited', async () => {
    renderShareFlyout();

    const memberRows = screen.getAllByTestId('agentBuilderConversationShareMemberRow');

    expect(memberRows).toHaveLength(1);
    expect(memberRows[0]).toHaveTextContent('Ethan Smith');
    expect(memberRows[0]).toHaveTextContent('Author');
    expect(screen.getByRole('heading', { name: 'In this chat (1)' })).toBeInTheDocument();
  });

  it('saves public access with no ACL entries', async () => {
    renderShareFlyout({
      conversation: {
        ...baseConversation,
        access_control: {
          access_mode: ConversationAccessControlMode.Private,
          entries: [
            {
              type: 'user',
              id: 'member-1',
              role: ConversationAccessControlRole.Member,
              added_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('agentBuilderConversationSharingAccessModeSelect'));
    });

    expect(screen.getByText('Any user can see and join this chat')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Public'));
    });

    expect(
      screen.queryByTestId('agentBuilderConversationSharingInviteSection')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('agentBuilderConversationSharingUsersSection')
    ).not.toBeInTheDocument();

    expect(mutate).toHaveBeenCalledWith({
      access_mode: ConversationAccessControlMode.Public,
      entries: [],
    });
  });

  it('removes an individual member from restricted access', async () => {
    renderShareFlyout({
      conversation: {
        ...baseConversation,
        access_control: {
          access_mode: ConversationAccessControlMode.Private,
          entries: [
            {
              type: 'user',
              id: 'member-1',
              role: ConversationAccessControlRole.Member,
              added_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      },
    });

    fireEvent.click(screen.getByTestId('agentBuilderConversationShareRemoveMember'));

    expect(mutate).toHaveBeenCalledWith({
      access_mode: ConversationAccessControlMode.Private,
      entries: [],
    });
  });

  it('fetches user suggestions for restricted sharing', () => {
    renderShareFlyout();

    expect(mockUseSuggestUsers).toHaveBeenLastCalledWith('', { enabled: true });
  });

  it('shows save errors inside the flyout', async () => {
    renderShareFlyout();

    act(() => {
      updateOptions.onError?.(new Error('nope'));
    });

    expect(screen.getByText('Failed to update sharing settings')).toBeInTheDocument();
  });

  it('adds every selected user at once', async () => {
    const user = userEvent.setup();
    renderShareFlyout({ suggestedProfiles: [memberProfile, secondMemberProfile] });

    const addButton = screen.getByTestId('agentBuilderConversationSharingAddUsersButton');
    expect(addButton).toBeDisabled();

    await user.click(screen.getByRole('combobox', { name: 'Search for users to add' }));
    await user.click(screen.getByRole('option', { name: /Alex Kim/ }));
    await user.click(screen.getByRole('combobox', { name: 'Search for users to add' }));
    await user.click(screen.getByRole('option', { name: /Sam Delacroix/ }));

    expect(mutate).not.toHaveBeenCalled();

    await user.click(addButton);

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({
      access_mode: ConversationAccessControlMode.Private,
      entries: [
        { type: 'user', id: 'member-1', role: ConversationAccessControlRole.Member },
        { type: 'user', id: 'member-2', role: ConversationAccessControlRole.Member },
      ],
    });
    expect(screen.getByRole('heading', { name: 'In this chat (3)' })).toBeInTheDocument();
    expect(addButton).toBeDisabled();
  });

  it('calls onClose from the close button', () => {
    renderShareFlyout();

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the agent access warning in the users section', async () => {
    mockUseAgentBuilderAgentById.mockReturnValue({
      agent: { name: 'Support agent' },
      isLoading: false,
      error: null,
    } as never);
    renderShareFlyout();

    expect(
      within(screen.getByTestId('agentBuilderConversationSharingUsersSection')).getByTestId(
        'agentBuilderConversationSharingAgentAccessWarning'
      )
    ).toHaveTextContent(
      'Search results display all users, but only users with access to Support agent can see this chat.'
    );
  });
});
