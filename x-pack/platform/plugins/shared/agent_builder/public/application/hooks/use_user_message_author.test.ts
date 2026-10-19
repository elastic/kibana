/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import {
  clearServiceAccountDisplayNameResolvers,
  registerServiceAccountDisplayName,
} from '../../service_account_display_name';
import { useCurrentUser } from './use_current_user';
import { useUserProfiles } from './use_user_profiles';
import { useUserMessageAuthor } from './use_user_message_author';

jest.mock('./use_current_user', () => ({
  useCurrentUser: jest.fn(),
}));

jest.mock('./use_user_profiles', () => ({
  useUserProfiles: jest.fn(),
}));

const mockUseCurrentUser = jest.mocked(useCurrentUser);
const mockUseUserProfiles = jest.mocked(useUserProfiles);

const currentUser = {
  uid: 'current-user',
  enabled: true,
  user: {
    username: 'alice',
    full_name: 'Alice Maria',
  },
  data: {
    avatar: {
      initials: 'AM',
    },
  },
} as UserProfileWithAvatar;

const authorProfile = {
  uid: 'user-1',
  enabled: true,
  user: {
    username: 'jdoe',
    full_name: 'Jane Doe',
  },
  data: {
    avatar: {
      initials: 'JD',
    },
  },
} as UserProfileWithAvatar;

const mockUserProfiles = (profiles: UserProfileWithAvatar[]) => {
  mockUseUserProfiles.mockReturnValue({ data: profiles } as unknown as ReturnType<
    typeof useUserProfiles
  >);
};

describe('useUserMessageAuthor', () => {
  beforeEach(() => {
    clearServiceAccountDisplayNameResolvers();
    jest.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({ currentUser, isLoading: false } as ReturnType<
      typeof useCurrentUser
    >);
    mockUserProfiles([]);
  });

  it('resolves the Kibana profile of a persisted author', () => {
    mockUserProfiles([authorProfile]);

    const { result } = renderHook(() =>
      useUserMessageAuthor({
        author: { id: 'user-1', username: 'jdoe' },
        isPendingCurrentRound: false,
      })
    );

    expect(mockUseUserProfiles).toHaveBeenCalledWith({ uids: ['user-1'] });
    expect(result.current.profile).toBe(authorProfile);
    expect(result.current.name).toBe('Jane Doe');
    expect(result.current.isCurrentUser).toBe(false);
  });

  it('does not resolve a profile for authors coming from an external system', () => {
    const { result } = renderHook(() =>
      useUserMessageAuthor({
        author: { id: 'slack-user-1', full_name: 'Jane Doe', username: 'jdoe' },
        origin: { type: ConversationOriginType.Slack },
        isPendingCurrentRound: false,
      })
    );

    expect(mockUseUserProfiles).toHaveBeenCalledWith({ uids: [] });
    expect(result.current.profile).toBeUndefined();
    expect(result.current.name).toBe('Jane Doe');
  });

  it('attributes a pending message without a persisted author to the current user', () => {
    const { result } = renderHook(() =>
      useUserMessageAuthor({ author: undefined, isPendingCurrentRound: true })
    );

    expect(mockUseUserProfiles).toHaveBeenCalledWith({ uids: [] });
    expect(result.current.profile).toBe(currentUser);
    expect(result.current.name).toBe('Alice Maria');
    expect(result.current.isCurrentUser).toBe(true);
  });

  it('keeps persisted author attribution on a pending message', () => {
    mockUserProfiles([authorProfile]);

    const { result } = renderHook(() =>
      useUserMessageAuthor({
        author: { id: 'user-1', username: 'jdoe' },
        isPendingCurrentRound: true,
      })
    );

    expect(result.current.profile).toBe(authorProfile);
    expect(result.current.isCurrentUser).toBe(false);
  });

  it('has no author for a non-pending message without persisted author attribution', () => {
    const { result } = renderHook(() =>
      useUserMessageAuthor({ author: undefined, isPendingCurrentRound: false })
    );

    expect(result.current.profile).toBeUndefined();
    expect(result.current.name).toBeUndefined();
    expect(result.current.isCurrentUser).toBe(false);
  });

  it('uses a registered worker name for a service account and does not look up a profile', () => {
    registerServiceAccountDisplayName(() => 'Alert Triage');

    const { result } = renderHook(() =>
      useUserMessageAuthor({
        author: {
          id: 'service_account:kibana/alertzero_alert_triage',
          username: 'kibana/alertzero_alert_triage',
          type: 'service_account',
        },
        isPendingCurrentRound: false,
      })
    );

    expect(mockUseUserProfiles).toHaveBeenCalledWith({ uids: [] });
    expect(result.current.profile).toBeUndefined();
    expect(result.current.name).toBe('Alert Triage');
    expect(result.current.isServiceAccount).toBe(true);
    expect(result.current.isCurrentUser).toBe(false);
  });

  it('keeps the username when no display name is registered for the service account', () => {
    const { result } = renderHook(() =>
      useUserMessageAuthor({
        author: {
          id: 'service_account:kibana/nightshift',
          username: 'kibana/nightshift',
          type: 'service_account',
        },
        isPendingCurrentRound: false,
      })
    );

    expect(result.current.name).toBe('kibana/nightshift');
    expect(result.current.isServiceAccount).toBe(true);
  });

  it('flags a persisted author matching the current user before their profile resolves', () => {
    const { result } = renderHook(() =>
      useUserMessageAuthor({
        author: { id: 'current-user', username: 'alice' },
        isPendingCurrentRound: false,
      })
    );

    expect(result.current.profile).toBeUndefined();
    expect(result.current.isCurrentUser).toBe(true);
  });
});
