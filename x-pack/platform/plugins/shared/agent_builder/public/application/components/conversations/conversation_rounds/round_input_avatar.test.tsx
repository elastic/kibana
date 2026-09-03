/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiAvatar } from '@elastic/eui';
import { UserAvatar, type UserProfileWithAvatar } from '@kbn/user-profile-components';
import { RoundInputAvatar } from './round_input_avatar';

jest.mock('@kbn/user-profile-components', () => ({
  UserAvatar: jest.fn(({ avatar }) => (
    <div data-test-subj="agentBuilderUserAvatar">{avatar?.initials}</div>
  )),
}));

jest.mock('@elastic/eui', () => ({
  EuiAvatar: jest.fn(({ name }) => <div data-test-subj="agentBuilderFallbackAvatar">{name}</div>),
}));

const mockUserAvatar = jest.mocked(UserAvatar);
const mockEuiAvatar = jest.mocked(EuiAvatar);

describe('RoundInputAvatar', () => {
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
    jest.clearAllMocks();
  });

  it('renders the user avatar when a profile is available', () => {
    render(<RoundInputAvatar profile={profile} name="Alice Example" />);

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
    render(<RoundInputAvatar name="Jane Doe" />);

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
    const { container } = render(<RoundInputAvatar />);

    expect(container).toBeEmptyDOMElement();
  });
});
