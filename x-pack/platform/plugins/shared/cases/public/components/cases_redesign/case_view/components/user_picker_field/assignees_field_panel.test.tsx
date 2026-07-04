/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSuggestUserProfiles } from '../../../../../containers/user_profiles/use_suggest_user_profiles';
import { useGetCurrentUserProfile } from '../../../../../containers/user_profiles/use_get_current_user_profile';
import { userProfiles, userProfilesMap } from '../../../../../containers/user_profiles/api.mock';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { noAssignCasesPermissions, renderWithTestingProviders } from '../../../../../common/mock';
import type { AssigneesFieldPanelProps } from './assignees_field_panel';
import { AssigneesFieldPanel } from './assignees_field_panel';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

jest.mock('../../../../../containers/user_profiles/use_suggest_user_profiles');
jest.mock('../../../../../containers/user_profiles/use_get_current_user_profile');

const useSuggestUserProfilesMock = useSuggestUserProfiles as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;

const currentUserProfile = userProfiles[0];

describe('AssigneesFieldPanel', () => {
  let defaultProps: AssigneesFieldPanelProps;

  beforeEach(() => {
    defaultProps = {
      caseAssignees: [],
      currentUserProfile,
      userProfiles: new Map(),
      onAssigneesChanged: jest.fn(),
      isLoading: false,
    };

    useSuggestUserProfilesMock.mockReturnValue({ data: userProfiles, isLoading: false });
    useGetCurrentUserProfileMock.mockReturnValue({ data: currentUserProfile, isLoading: false });
  });

  it('renders a bordered panel with the Assigned label', () => {
    renderWithTestingProviders(<AssigneesFieldPanel {...defaultProps} />);

    expect(screen.getByTestId('case-view-assignees-field-panel')).toHaveClass('euiPanel');
    expect(screen.getByText('Assigned')).toBeInTheDocument();
  });

  it('shows the empty state when there are no assignees', () => {
    renderWithTestingProviders(<AssigneesFieldPanel {...defaultProps} />);

    expect(screen.getByText('No users are assigned')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-assign-users-link')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-assign-yourself-link')).toBeInTheDocument();
  });

  it('does not show the add button when the user does not have assign permissions', () => {
    const props = {
      ...defaultProps,
      caseAssignees: userProfiles.slice(0, 2),
      userProfiles: userProfilesMap,
    };

    renderWithTestingProviders(<AssigneesFieldPanel {...props} />, {
      wrapperProps: { permissions: noAssignCasesPermissions() },
    });

    expect(screen.queryByTestId('case-view-assignees-add-button')).not.toBeInTheDocument();
  });

  it('does not show assign links when the user does not have assign permissions', () => {
    renderWithTestingProviders(<AssigneesFieldPanel {...defaultProps} />, {
      wrapperProps: { permissions: noAssignCasesPermissions() },
    });

    expect(screen.queryByTestId('case-view-assign-users-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('case-view-assign-yourself-link')).not.toBeInTheDocument();
  });

  it('shows a loading spinner when loading and there are no assignees', () => {
    renderWithTestingProviders(<AssigneesFieldPanel {...{ ...defaultProps, isLoading: true }} />);

    expect(screen.getByTestId('case-view-assignees-button-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('case-view-assignees-add-button')).not.toBeInTheDocument();
  });

  it('renders assignee avatars and the add button when assignees exist', () => {
    const props = {
      ...defaultProps,
      caseAssignees: userProfiles.slice(0, 2),
      userProfiles: userProfilesMap,
    };

    renderWithTestingProviders(<AssigneesFieldPanel {...props} />);

    expect(screen.getByTestId('case-view-assignees-add-button')).toBeInTheDocument();
    expect(screen.getByTestId('case-user-profile-avatar-damaged_raccoon')).toBeInTheDocument();
    expect(screen.getByTestId('case-user-profile-avatar-physical_dinosaur')).toBeInTheDocument();
    expect(screen.queryByText('No users are assigned')).not.toBeInTheDocument();
  });

  it('opens the assignees popover when the add button is clicked', async () => {
    const props = {
      ...defaultProps,
      caseAssignees: userProfiles.slice(0, 1),
      userProfiles: userProfilesMap,
    };

    renderWithTestingProviders(<AssigneesFieldPanel {...props} />);

    fireEvent.click(screen.getByTestId('case-view-assignees-add-button'));
    await waitForEuiPopoverOpen();

    expect(screen.getByPlaceholderText('Search users')).toBeInTheDocument();
  });

  it('opens the assignees popover when the assign a user link is clicked', async () => {
    renderWithTestingProviders(<AssigneesFieldPanel {...defaultProps} />);

    fireEvent.click(screen.getByTestId('case-view-assign-users-link'));
    await waitForEuiPopoverOpen();

    expect(screen.getByPlaceholderText('Search users')).toBeInTheDocument();
  });

  it('assigns the current user when the assign yourself link is clicked', async () => {
    const onAssigneesChanged = jest.fn();

    renderWithTestingProviders(
      <AssigneesFieldPanel {...defaultProps} onAssigneesChanged={onAssigneesChanged} />
    );

    fireEvent.click(screen.getByTestId('case-view-assign-yourself-link'));

    await waitFor(() => {
      expect(onAssigneesChanged).toHaveBeenCalledTimes(1);
    });
  });
});
