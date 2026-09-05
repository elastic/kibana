/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
} from '@kbn/agent-builder-common';
import type { ConversationWithPermissions } from '../../../../../../common/http_api/conversations';
import {
  useConversation,
  useConversationPermissions,
  useIsUnpersistedConversation,
} from '../../../../hooks/use_conversation';
import { useSuggestUsers } from '../../../../hooks/use_suggest_users';
import {
  useInviteMembersSummary,
  useUpdateConversationAccessControl,
} from '../../../../hooks/use_conversation_access_control';
import { useUserProfiles } from '../../../../hooks/use_user_profiles';
import { ConversationShareButton } from './conversation_share_button';

jest.mock('../../../../hooks/use_conversation', () => ({
  useConversation: jest.fn(),
  useConversationPermissions: jest.fn(),
  useIsUnpersistedConversation: jest.fn(),
}));

jest.mock('../../../../hooks/use_suggest_users', () => ({
  useSuggestUsers: jest.fn(),
}));

jest.mock('../../../../hooks/use_conversation_access_control', () => {
  const actual = jest.requireActual('../../../../hooks/use_conversation_access_control');

  return {
    hasInviteMembersSummary: actual.hasInviteMembersSummary,
    useInviteMembersSummary: jest.fn(),
    useUpdateConversationAccessControl: jest.fn(),
  };
});

jest.mock('../../../../hooks/use_user_profiles', () => ({
  useUserProfiles: jest.fn(),
}));

jest.mock('../../../../hooks/agents/use_agent_by_id', () => ({
  useAgentBuilderAgentById: () => ({ agent: null, isLoading: false, error: null }),
}));

const mockUseConversation = jest.mocked(useConversation);
const mockUseConversationPermissions = jest.mocked(useConversationPermissions);
const mockUseIsUnpersistedConversation = jest.mocked(useIsUnpersistedConversation);
const mockUseSuggestUsers = jest.mocked(useSuggestUsers);
const mockUseInviteMembersSummary = jest.mocked(useInviteMembersSummary);
const mockUseUpdateConversationAccessControl = jest.mocked(useUpdateConversationAccessControl);
const mockUseUserProfiles = jest.mocked(useUserProfiles);

const mutate = jest.fn();
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

const renderShareButton = ({
  conversation = baseConversation,
  canUpdateAccessControl = true,
  isUnpersistedConversation = false,
  inviteMembersSummary = { profiles: [], extraCount: 0, shouldShowSummary: false },
}: {
  conversation?: ConversationWithPermissions;
  canUpdateAccessControl?: boolean;
  isUnpersistedConversation?: boolean;
  inviteMembersSummary?: ReturnType<typeof useInviteMembersSummary>;
} = {}) => {
  mockUseConversation.mockReturnValue({
    conversation,
    isLoading: false,
    isFetching: false,
    isFetched: true,
    isError: false,
    error: null,
  });
  mockUseIsUnpersistedConversation.mockReturnValue(isUnpersistedConversation);
  mockUseConversationPermissions.mockReturnValue({
    rename: false,
    delete: false,
    update_access_control: canUpdateAccessControl,
  });
  mockUseSuggestUsers.mockReturnValue({ data: [], isFetching: false } as never);
  mockUseInviteMembersSummary.mockReturnValue(inviteMembersSummary);
  mockUseUserProfiles.mockReturnValue({
    data: [ownerProfile, memberProfile, secondMemberProfile, thirdMemberProfile],
  } as never);
  mockUseUpdateConversationAccessControl.mockImplementation((options) => {
    updateOptions = options;
    return { mutate, isLoading: false } as never;
  });

  render(
    <EuiThemeProvider>
      <IntlProvider locale="en">
        <ConversationShareButton />
      </IntlProvider>
    </EuiThemeProvider>
  );
};

const openPopover = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId('agentBuilderConversationInviteButton'));
  });
};

describe('ConversationShareButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render without access-control update permission or shared members', () => {
    renderShareButton({ canUpdateAccessControl: false });

    expect(screen.queryByTestId('agentBuilderConversationInviteButton')).not.toBeInTheDocument();
  });

  it('does not render while the conversation is unpersisted', () => {
    renderShareButton({ isUnpersistedConversation: true });

    expect(screen.queryByTestId('agentBuilderConversationInviteButton')).not.toBeInTheDocument();
  });

  it('opens a read-only members popover without access-control update permission', async () => {
    renderShareButton({
      canUpdateAccessControl: false,
      inviteMembersSummary: {
        profiles: [memberProfile],
        extraCount: 0,
        shouldShowSummary: true,
      },
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

    expect(screen.getByTestId('agentBuilderConversationInviteMembersSummary')).toBeInTheDocument();
    expect(screen.queryByText('Invite')).not.toBeInTheDocument();

    await openPopover();

    expect(screen.getByTestId('agentBuilderConversationSharingPopover')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Participants' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sharing' })).not.toBeInTheDocument();
    expect(screen.queryByText('Current members')).not.toBeInTheDocument();
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

  it('opens the sharing popover with owner and current members', async () => {
    renderShareButton({
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

    await openPopover();

    expect(screen.getByTestId('agentBuilderConversationSharingPopover')).toBeInTheDocument();
    expect(screen.getByText('Ethan Smith')).toBeInTheDocument();
    expect(screen.getByText('Alex Kim')).toBeInTheDocument();
    expect(screen.getByText('Author')).toBeInTheDocument();
    expect(screen.queryByText('Member')).not.toBeInTheDocument();
    expect(screen.getByText('Only manually added members can see this chat')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderConversationSharingUserSearchIcon')).toBeInTheDocument();
  });

  it('orders current members alphabetically by display name', async () => {
    renderShareButton({
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

    await openPopover();

    expect(
      screen.getAllByTestId('agentBuilderConversationShareMemberRow').map((row) => row.textContent)
    ).toEqual([
      expect.stringContaining('Ethan Smith'),
      expect.stringContaining('Alex Kim'),
      expect.stringContaining('Sam Delacroix'),
      expect.stringContaining('Yuki Tanaka'),
    ]);
  });

  it('shows the latest shared member avatars in the invite trigger', () => {
    renderShareButton({
      inviteMembersSummary: {
        profiles: [thirdMemberProfile, secondMemberProfile],
        extraCount: 1,
        shouldShowSummary: true,
      },
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
            {
              type: 'user',
              id: 'member-2',
              role: ConversationAccessControlRole.Member,
              added_at: '2026-01-02T00:00:00.000Z',
            },
            {
              type: 'user',
              id: 'member-3',
              role: ConversationAccessControlRole.Member,
              added_at: '2026-01-03T00:00:00.000Z',
            },
          ],
        },
      },
    });

    const membersSummary = screen.getByTestId('agentBuilderConversationInviteMembersSummary');
    const visibleMemberAvatars = within(membersSummary).getAllByTestId(
      /agentBuilderConversationInviteMemberAvatar-/
    );

    expect(membersSummary).toBeInTheDocument();
    expect(mockUseInviteMembersSummary).toHaveBeenCalledWith();
    expect(
      screen.queryByTestId('agentBuilderConversationInviteMemberAvatar-member-1')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('agentBuilderConversationInviteMemberAvatar-member-2')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('agentBuilderConversationInviteMemberAvatar-member-3')
    ).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderConversationInviteMembersExtraCount')).toHaveTextContent(
      '+1'
    );
    expect(
      screen.getByTestId('agentBuilderConversationInviteMembersExtraCount')
    ).toHaveAccessibleName('1 more member');
    expect(visibleMemberAvatars.map((avatar) => avatar.getAttribute('data-test-subj'))).toEqual([
      'agentBuilderConversationInviteMemberAvatar-member-3',
      'agentBuilderConversationInviteMemberAvatar-member-2',
    ]);
  });

  it('saves public access with no ACL entries', async () => {
    renderShareButton({
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

    await openPopover();

    await act(async () => {
      fireEvent.click(screen.getByTestId('agentBuilderConversationSharingAccessModeSelect'));
    });

    expect(screen.getByText('Any user can see and join this chat')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Public'));
    });

    expect(screen.queryByText('Current members')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('agentBuilderConversationSharingUserSearch')
    ).not.toBeInTheDocument();

    expect(mutate).toHaveBeenCalledWith({
      access_mode: ConversationAccessControlMode.Public,
      entries: [],
    });
  });

  it('removes an individual member from restricted access', async () => {
    renderShareButton({
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

    await openPopover();
    fireEvent.click(screen.getByTestId('agentBuilderConversationShareRemoveMember'));

    expect(mutate).toHaveBeenCalledWith({
      access_mode: ConversationAccessControlMode.Private,
      entries: [],
    });
  });

  it('enables user suggestions only while the restricted sharing popover is open', async () => {
    renderShareButton();

    expect(mockUseSuggestUsers).toHaveBeenLastCalledWith('', { enabled: false });

    await openPopover();

    expect(mockUseSuggestUsers).toHaveBeenLastCalledWith('', { enabled: true });
  });

  it('resets the user suggestion search when reopening the sharing popover', async () => {
    renderShareButton();
    await openPopover();

    fireEvent.change(screen.getByLabelText('Search for users to add'), {
      target: { value: 'not-a-user' },
    });

    await waitFor(() => {
      expect(mockUseSuggestUsers).toHaveBeenLastCalledWith('not-a-user', { enabled: true });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('agentBuilderConversationSharingCloseButton'));
    });
    await openPopover();

    expect(mockUseSuggestUsers).toHaveBeenLastCalledWith('', { enabled: true });
  });

  it('shows save errors inside the popover', async () => {
    renderShareButton();
    await openPopover();

    act(() => {
      updateOptions.onError?.(new Error('nope'));
    });

    expect(screen.getByText('Failed to update sharing settings')).toBeInTheDocument();
  });
});
