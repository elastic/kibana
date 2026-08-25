/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
} from '@kbn/agent-builder-common';
import type { ConversationWithPermissions } from '../../../../../common/http_api/conversations';
import {
  useConversation,
  useConversationPermissions,
  useHasPersistedConversation,
} from '../../../hooks/use_conversation';
import { useSuggestUsers } from '../../../hooks/use_suggest_users';
import {
  useConversationAccessControlProfiles,
  useUpdateConversationAccessControl,
} from '../../../hooks/use_conversation_access_control';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
import { ConversationShareButton } from './conversation_share_button';

jest.mock('../../../hooks/use_conversation', () => ({
  useConversation: jest.fn(),
  useConversationPermissions: jest.fn(),
  useHasPersistedConversation: jest.fn(),
}));

jest.mock('../../../hooks/use_suggest_users', () => ({
  useSuggestUsers: jest.fn(),
}));

jest.mock('../../../hooks/use_conversation_access_control', () => ({
  useConversationAccessControlProfiles: jest.fn(),
  useUpdateConversationAccessControl: jest.fn(),
}));

jest.mock('../../../hooks/use_experimental_features', () => ({
  useExperimentalFeatures: jest.fn(),
}));

const mockUseConversation = jest.mocked(useConversation);
const mockUseConversationPermissions = jest.mocked(useConversationPermissions);
const mockUseHasPersistedConversation = jest.mocked(useHasPersistedConversation);
const mockUseSuggestUsers = jest.mocked(useSuggestUsers);
const mockUseConversationAccessControlProfiles = jest.mocked(useConversationAccessControlProfiles);
const mockUseUpdateConversationAccessControl = jest.mocked(useUpdateConversationAccessControl);
const mockUseExperimentalFeatures = jest.mocked(useExperimentalFeatures);

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
  isExperimentalFeaturesEnabled = true,
}: {
  conversation?: ConversationWithPermissions;
  canUpdateAccessControl?: boolean;
  isExperimentalFeaturesEnabled?: boolean;
} = {}) => {
  mockUseConversation.mockReturnValue({
    conversation,
    isLoading: false,
    isFetching: false,
    isFetched: true,
    isError: false,
    error: null,
  });
  mockUseHasPersistedConversation.mockReturnValue(Boolean(conversation));
  mockUseConversationPermissions.mockReturnValue({
    rename: false,
    delete: false,
    update_access_control: canUpdateAccessControl,
  });
  mockUseExperimentalFeatures.mockReturnValue(isExperimentalFeaturesEnabled);
  mockUseSuggestUsers.mockReturnValue({ data: [], isFetching: false } as never);
  mockUseConversationAccessControlProfiles.mockReturnValue({
    data: [ownerProfile, memberProfile],
  } as never);
  mockUseUpdateConversationAccessControl.mockImplementation((options) => {
    updateOptions = options;
    return { mutate, isLoading: false } as never;
  });

  render(
    <IntlProvider locale="en">
      <ConversationShareButton />
    </IntlProvider>
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

  it('does not render without access-control update permission', () => {
    renderShareButton({ canUpdateAccessControl: false });

    expect(screen.queryByTestId('agentBuilderConversationInviteButton')).not.toBeInTheDocument();
  });

  it('does not render when experimental features are disabled', () => {
    renderShareButton({ isExperimentalFeaturesEnabled: false });

    expect(screen.queryByTestId('agentBuilderConversationInviteButton')).not.toBeInTheDocument();
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

  it('shows save errors inside the popover', async () => {
    renderShareButton();
    await openPopover();

    act(() => {
      updateOptions.onError?.(new Error('nope'));
    });

    expect(screen.getByText('Failed to update sharing settings')).toBeInTheDocument();
  });
});
