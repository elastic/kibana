/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useUserProfiles } from '../../../hooks/use_user_profiles';
import { RoundAuthorHeader } from './round_author_header';

jest.mock('../../../hooks/use_user_profiles', () => ({
  useUserProfiles: jest.fn(),
}));

const mockUseUserProfiles = jest.mocked(useUserProfiles);

describe('RoundAuthorHeader', () => {
  const startedAt = '2026-01-01T13:00:00.000Z';
  const authorProfile: UserProfileWithAvatar = {
    uid: 'user-1',
    enabled: true,
    user: {
      username: 'alice',
      full_name: 'Alice Example',
    },
    data: {
      avatar: {
        initials: 'AE',
        color: '#f4d9ff',
      },
    },
  };

  beforeEach(() => {
    mockUseUserProfiles.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useUserProfiles
    >);
  });

  it('renders the user author and Slack origin', () => {
    render(
      <RoundAuthorHeader
        actor="user"
        startedAt={startedAt}
        author={{ id: 'user-1', full_name: 'Jane Doe', username: 'jdoe' }}
        origin={{ type: ConversationOriginType.Slack }}
      />
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('via Slack')).toBeInTheDocument();
  });

  it('uses the user profile display name and avatar when provided', () => {
    render(
      <RoundAuthorHeader
        actor="user"
        startedAt={startedAt}
        author={{ id: 'user-1', username: 'alice' }}
        authorProfile={authorProfile}
      />
    );

    expect(screen.getByText('Alice Example')).toBeInTheDocument();
    expect(screen.getByText('AE')).toBeInTheDocument();
  });

  it('resolves a Kibana author profile when only the round author is available', () => {
    mockUseUserProfiles.mockReturnValue({
      data: [authorProfile],
    } as unknown as ReturnType<typeof useUserProfiles>);

    render(
      <RoundAuthorHeader
        actor="user"
        startedAt={startedAt}
        author={{ id: 'user-1', username: 'alice' }}
      />
    );

    expect(mockUseUserProfiles).toHaveBeenCalledWith({
      uids: ['user-1'],
      enabled: true,
    });
    expect(screen.getByText('Alice Example')).toBeInTheDocument();
    expect(screen.getByText('AE')).toBeInTheDocument();
  });

  it('falls back to Me for user-authored rounds without a name', () => {
    render(<RoundAuthorHeader actor="user" startedAt={startedAt} />);

    expect(screen.getByText('Me')).toBeInTheDocument();
  });

  it('renders the agent label', () => {
    render(<RoundAuthorHeader actor="agent" startedAt={startedAt} />);

    expect(screen.getByText('Elastic AI Agent')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });
});
