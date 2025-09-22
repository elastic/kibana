/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { UserProfilesSearch } from './user_profiles_search';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { MOCK_USER_PROFILE } from '../../mock/conversation';

const mockSecondUser = {
  ...MOCK_USER_PROFILE,
  uid: 'user-2',
  user: {
    email: 'test_guy_stevens@elastic.co',
    full_name: 'Guy Stevens',
    username: 'test_guy_stevens',
  },
};
jest.mock('./use_user_profiles', () => ({
  useUserProfiles: () => ({
    data: [MOCK_USER_PROFILE],
  }),
}));
jest.mock('./use_suggest_user_profiles', () => ({
  useSuggestUserProfiles: () => ({
    data: [MOCK_USER_PROFILE, mockSecondUser],
  }),
}));
const testProps = {
  forbiddenUsers: ['user-2'],
  onUsersSelect: jest.fn(),
  selectedUsers: [MOCK_USER_PROFILE],
};

describe('UserProfilesSearch', () => {
  it('renders UserProfilesSearch', () => {
    render(
      <TestProviders>
        <UserProfilesSearch {...testProps} />
      </TestProviders>
    );
    expect(screen.getByTestId('userProfilesSearch')).toBeInTheDocument();
  });

  it('shows selected user', () => {
    render(
      <TestProviders>
        <UserProfilesSearch {...testProps} />
      </TestProviders>
    );
    expect(
      screen
        .getByTestId(`userProfileSelectableOption-${MOCK_USER_PROFILE.user.username}`)
        .getAttribute('aria-checked')
    ).toEqual('true');
    expect(
      screen
        .getByTestId(`userProfileSelectableOption-${mockSecondUser.user.username}`)
        .getAttribute('aria-checked')
    ).toEqual('false');
  });

  it('calls onUsersSelect when user is selected', async () => {
    render(
      <TestProviders>
        <UserProfilesSearch {...testProps} />
      </TestProviders>
    );
    fireEvent.click(
      screen.getByTestId(`userProfileSelectableOption-${mockSecondUser.user.username}`)
    );
    expect(testProps.onUsersSelect).toHaveBeenCalledWith([mockSecondUser, MOCK_USER_PROFILE]);
  });
});
