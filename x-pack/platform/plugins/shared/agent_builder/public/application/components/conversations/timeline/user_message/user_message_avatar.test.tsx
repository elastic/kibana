/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiAvatar } from '@elastic/eui';
import { UserAvatar, type UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserMessageAvatar } from './user_message_avatar';

vi.mock('@kbn/user-profile-components', () => {
  const mocked = {
    UserAvatar: vi.fn(({ avatar }) => (
      <div data-test-subj="agentBuilderUserAvatar">{avatar?.initials}</div>
    )),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@elastic/eui', () => {
  const mocked = {
    EuiAvatar: vi.fn(({ name }) => <div data-test-subj="agentBuilderFallbackAvatar">{name}</div>),
  };
  return { ...mocked, default: mocked };
});

const mockUserAvatar = vi.mocked(UserAvatar);
const mockEuiAvatar = vi.mocked(EuiAvatar);

describe('UserMessageAvatar', () => {
  const profile: UserProfileWithAvatar = {
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
    vi.clearAllMocks();
  });

  it('renders the user avatar when a profile is available', () => {
    render(<UserMessageAvatar profile={profile} name="Alice Example" />);

    expect(mockUserAvatar).toHaveBeenCalledWith(
      expect.objectContaining({
        user: profile.user,
        avatar: profile.data?.avatar,
        size: 's',
      }),
      expect.anything()
    );
    expect(screen.getByTestId('agentBuilderUserAvatar')).toHaveTextContent('AE');
  });

  it('renders a fallback avatar from the author name when no profile is available', () => {
    render(<UserMessageAvatar name="Jane Doe" />);

    expect(mockEuiAvatar).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 's',
        name: 'Jane Doe',
      }),
      expect.anything()
    );
    expect(screen.getByTestId('agentBuilderFallbackAvatar')).toHaveTextContent('Jane Doe');
  });

  it('renders nothing when the author is unknown', () => {
    const { container } = render(<UserMessageAvatar />);

    expect(container).toBeEmptyDOMElement();
  });
});
