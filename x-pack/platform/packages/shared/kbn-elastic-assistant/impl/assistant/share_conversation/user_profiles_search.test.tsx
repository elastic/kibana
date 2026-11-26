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
const mockThirdUser = {
  ...MOCK_USER_PROFILE,
  uid: 'user-3',
  user: {
    email: 'test_ada_lane@elastic.co',
    full_name: 'Ada Lane',
    username: 'test_ada_lane',
  },
};
const mockUseUserProfiles = jest.fn();
jest.mock('./use_user_profiles', () => ({
  useUserProfiles: () => mockUseUserProfiles(),
}));
jest.mock('./use_suggest_user_profiles', () => ({
  useSuggestUserProfiles: () => ({
    data: [MOCK_USER_PROFILE, mockSecondUser, mockThirdUser],
  }),
}));
const testProps = {
  forbiddenUsers: ['user-2'],
  onUsersSelect: jest.fn(),
  selectedUsers: [MOCK_USER_PROFILE],
};

describe('UserProfilesSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserProfiles.mockReturnValue({ data: [MOCK_USER_PROFILE] });
  });

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

  it('keeps the selected users when a user is selected while their profiles load', () => {
    mockUseUserProfiles.mockReturnValue({ data: undefined });
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

  it('keeps a selected user checked when the profile lookup omits them', () => {
    mockUseUserProfiles.mockReturnValue({ data: [] });
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
    fireEvent.click(
      screen.getByTestId(`userProfileSelectableOption-${mockSecondUser.user.username}`)
    );
    expect(testProps.onUsersSelect).toHaveBeenCalledWith([mockSecondUser, MOCK_USER_PROFILE]);
  });

  it('keeps every selected user when the profile lookup returns only some of them', () => {
    const enrichedFirstUser = { ...MOCK_USER_PROFILE, data: { avatar: { initials: 'VB' } } };
    mockUseUserProfiles.mockReturnValue({ data: [enrichedFirstUser] });
    render(
      <TestProviders>
        <UserProfilesSearch
          {...testProps}
          forbiddenUsers={[]}
          selectedUsers={[MOCK_USER_PROFILE, mockSecondUser]}
        />
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
    ).toEqual('true');
    fireEvent.click(
      screen.getByTestId(`userProfileSelectableOption-${mockThirdUser.user.username}`)
    );
    expect(testProps.onUsersSelect).toHaveBeenCalledWith([
      mockThirdUser,
      enrichedFirstUser,
      mockSecondUser,
    ]);
  });
});
