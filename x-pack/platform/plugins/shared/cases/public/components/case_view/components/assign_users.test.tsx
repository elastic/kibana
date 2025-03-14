/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import { useGetCurrentUserProfile } from '../../../containers/user_profiles/use_get_current_user_profile';
import { userProfiles, userProfilesMap } from '../../../containers/user_profiles/api.mock';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer, noAssignCasesPermissions } from '../../../common/mock';
import type { AssignUsersProps } from './assign_users';
import { AssignUsers } from './assign_users';
import { waitForEuiPopoverClose, waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

jest.mock('../../../containers/user_profiles/use_suggest_user_profiles');
jest.mock('../../../containers/user_profiles/use_get_current_user_profile');

const useSuggestUserProfilesMock = useSuggestUserProfiles as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;

const currentUserProfile = userProfiles[0];

describe('AssignUsers', () => {
  let appMockRender: AppMockRenderer;
  let defaultProps: AssignUsersProps;

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

    appMockRender = createAppMockRenderer();
  });

  it('does not show any assignees when there are none assigned', () => {
    appMockRender.render(<AssignUsers {...defaultProps} />);

    expect(screen.getByText('No users are assigned')).toBeInTheDocument();
  });

  it('does not show the suggest users edit button when the user does not have assign permissions', () => {
    appMockRender = createAppMockRenderer({ permissions: noAssignCasesPermissions() });
    appMockRender.render(<AssignUsers {...defaultProps} />);

    expect(screen.queryByText('case-view-assignees-edit')).not.toBeInTheDocument();
  });

  it('does not show the assign users link when the user does not have assign permissions', () => {
    appMockRender = createAppMockRenderer({ permissions: noAssignCasesPermissions() });
    appMockRender.render(<AssignUsers {...defaultProps} />);

    expect(screen.queryByTestId('assign yourself')).not.toBeInTheDocument();
    expect(screen.queryByTestId('Assign a user')).not.toBeInTheDocument();
  });

  it('does not show the suggest users edit button when the component is still loading', () => {
    appMockRender.render(<AssignUsers {...{ ...defaultProps, isLoading: true }} />);

    expect(screen.queryByTestId('case-view-assignees-edit')).not.toBeInTheDocument();
    expect(screen.getByTestId('case-view-assignees-button-loading')).toBeInTheDocument();
  });

  it('does not show the assign yourself link when the current profile is undefined', () => {
    appMockRender.render(<AssignUsers {...{ ...defaultProps, currentUserProfile: undefined }} />);

    expect(screen.queryByText('assign yourself')).not.toBeInTheDocument();
    expect(screen.getByText('Assign a user')).toBeInTheDocument();
  });

  it('shows the suggest users edit button when the user has update permissions', () => {
    appMockRender.render(<AssignUsers {...defaultProps} />);

    expect(screen.getByTestId('case-view-assignees-edit')).toBeInTheDocument();
  });

  it('shows the two initially assigned users', () => {
    const props = {
      ...defaultProps,
      caseAssignees: userProfiles.slice(0, 2),
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
    expect(screen.getByText('Physical Dinosaur')).toBeInTheDocument();
    expect(screen.queryByText('Wet Dingo')).not.toBeInTheDocument();
    expect(screen.queryByText('No users are assigned')).not.toBeInTheDocument();
    expect(screen.queryByTestId('case-view-assignees-loading')).not.toBeInTheDocument();
  });

  it('shows the rerendered assignees', () => {
    const { rerender } = appMockRender.render(<AssignUsers {...defaultProps} />);

    const props = {
      ...defaultProps,
      caseAssignees: userProfiles.slice(0, 2),
      userProfiles: userProfilesMap,
    };
    rerender(<AssignUsers {...props} />);

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
    expect(screen.getByText('Physical Dinosaur')).toBeInTheDocument();
    expect(screen.queryByText('Wet Dingo')).not.toBeInTheDocument();
    expect(screen.queryByText('No users are assigned')).not.toBeInTheDocument();
    expect(screen.queryByTestId('case-view-assignees-loading')).not.toBeInTheDocument();
  });

  it('shows the popover when the pencil is clicked', async () => {
    const props = {
      ...defaultProps,
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));
    await waitForEuiPopoverOpen();
    fireEvent.change(screen.getByPlaceholderText('Search users'), {
      target: { value: 'damaged_raccoon@elastic.co' },
    });

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
  });

  it('shows the popover when the assign a user link is clicked', async () => {
    const props = {
      ...defaultProps,
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.click(screen.getByText('Assign a user'));
    await waitForEuiPopoverOpen();
    fireEvent.change(screen.getByPlaceholderText('Search users'), {
      target: { value: 'damaged_raccoon@elastic.co' },
    });

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
  });

  it('assigns the current user when the assign yourself link is clicked', async () => {
    const onAssigneesChanged = jest.fn();
    const props = {
      ...defaultProps,
      onAssigneesChanged,
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.click(screen.getByText('assign yourself'));

    await waitFor(() => expect(onAssigneesChanged).toBeCalledTimes(1));

    expect(onAssigneesChanged.mock.calls[0][0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {},
          "enabled": true,
          "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
          "user": Object {
            "email": "damaged_raccoon@elastic.co",
            "full_name": "Damaged Raccoon",
            "username": "damaged_raccoon",
          },
        },
      ]
    `);
  });

  it('calls onAssigneesChanged with an empty array because all the users were deleted', async () => {
    const onAssigneesChanged = jest.fn();
    const props = {
      ...defaultProps,
      caseAssignees: [{ uid: userProfiles[0].uid }],
      onAssigneesChanged,
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.mouseEnter(
      screen.getByTestId(`user-profile-assigned-user-${userProfiles[0].user.username}-remove-group`)
    );
    fireEvent.click(
      screen.getByTestId(
        `user-profile-assigned-user-${userProfiles[0].user.username}-remove-button`
      )
    );

    await waitFor(() => expect(onAssigneesChanged).toBeCalledTimes(1));

    expect(onAssigneesChanged.mock.calls[0][0]).toMatchInlineSnapshot(`Array []`);
  });

  it('calls onAssigneesChanged when the popover is closed using the pencil button', async () => {
    const onAssigneesChanged = jest.fn();
    const props = {
      ...defaultProps,
      onAssigneesChanged,
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));
    await waitForEuiPopoverOpen();
    fireEvent.change(screen.getByPlaceholderText('Search users'), {
      target: { value: 'damaged_raccoon@elastic.co' },
    });

    fireEvent.click(screen.getByText('Damaged Raccoon'));

    // close the popover
    fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));
    await waitForEuiPopoverClose();

    await waitFor(() => expect(onAssigneesChanged).toBeCalledTimes(1));

    expect(onAssigneesChanged.mock.calls[0][0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {},
          "enabled": true,
          "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
          "user": Object {
            "email": "damaged_raccoon@elastic.co",
            "full_name": "Damaged Raccoon",
            "username": "damaged_raccoon",
          },
        },
      ]
    `);
  });

  it('does not call onAssigneesChanged when the selected assignees have not changed between renders', async () => {
    const onAssigneesChanged = jest.fn();
    const props = {
      ...defaultProps,
      caseAssignees: [{ uid: userProfiles[0].uid }],
      onAssigneesChanged,
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));
    await waitForEuiPopoverOpen();

    // close the popover
    fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));
    await waitForEuiPopoverClose();

    await waitFor(() => expect(onAssigneesChanged).toBeCalledTimes(0));
  });

  it('calls onAssigneesChanged without unknownId1', async () => {
    const onAssigneesChanged = jest.fn();
    const props = {
      ...defaultProps,
      caseAssignees: [{ uid: 'unknownId1' }, { uid: 'unknownId2' }],
      onAssigneesChanged,
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.mouseEnter(screen.getByTestId(`user-profile-assigned-user-unknownId1-remove-group`));
    fireEvent.click(screen.getByTestId(`user-profile-assigned-user-unknownId1-remove-button`));

    await waitFor(() => expect(onAssigneesChanged).toBeCalledTimes(1));

    expect(onAssigneesChanged.mock.calls[0][0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "uid": "unknownId2",
        },
      ]
    `);
  });

  it('renders two unknown users and one user with a profile', async () => {
    const props = {
      ...defaultProps,
      caseAssignees: [{ uid: 'unknownId1' }, { uid: 'unknownId2' }, { uid: userProfiles[0].uid }],
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
    expect(
      screen.getByTestId('user-profile-assigned-user-unknownId1-remove-group')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('user-profile-assigned-user-unknownId2-remove-group')
    ).toBeInTheDocument();
  });

  it('calls onAssigneesChanged with both users with profiles and without', async () => {
    const onAssigneesChanged = jest.fn();
    const props = {
      ...defaultProps,
      caseAssignees: [{ uid: 'unknownId1' }, { uid: 'unknownId2' }],
      onAssigneesChanged,
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));
    await waitForEuiPopoverOpen();
    fireEvent.change(screen.getByPlaceholderText('Search users'), {
      target: { value: 'damaged_raccoon@elastic.co' },
    });

    fireEvent.click(screen.getByText('Damaged Raccoon'));

    // close the popover
    fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));
    await waitForEuiPopoverClose();

    await waitFor(() => expect(onAssigneesChanged).toBeCalledTimes(1));

    expect(onAssigneesChanged.mock.calls[0][0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {},
          "enabled": true,
          "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
          "user": Object {
            "email": "damaged_raccoon@elastic.co",
            "full_name": "Damaged Raccoon",
            "username": "damaged_raccoon",
          },
        },
        Object {
          "uid": "unknownId1",
        },
        Object {
          "uid": "unknownId2",
        },
      ]
    `);
  });

  it('calls onAssigneesChanged with the unknown users at the end', async () => {
    const onAssigneesChanged = jest.fn();
    const props = {
      ...defaultProps,
      caseAssignees: [{ uid: userProfiles[1].uid }, { uid: 'unknownId1' }, { uid: 'unknownId2' }],
      onAssigneesChanged,
      userProfiles: userProfilesMap,
    };
    appMockRender.render(<AssignUsers {...props} />);

    fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));
    await waitForEuiPopoverOpen();

    fireEvent.change(screen.getByPlaceholderText('Search users'), {
      target: { value: 'damaged_raccoon@elastic.co' },
    });

    fireEvent.click(screen.getByText('Damaged Raccoon'));

    // close the popover
    fireEvent.click(screen.getByTestId('case-view-assignees-edit-button'));
    await waitForEuiPopoverClose();

    await waitFor(() => expect(onAssigneesChanged).toBeCalledTimes(1));

    expect(onAssigneesChanged.mock.calls[0][0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {},
          "enabled": true,
          "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
          "user": Object {
            "email": "damaged_raccoon@elastic.co",
            "full_name": "Damaged Raccoon",
            "username": "damaged_raccoon",
          },
        },
        Object {
          "data": Object {},
          "enabled": true,
          "uid": "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
          "user": Object {
            "email": "physical_dinosaur@elastic.co",
            "full_name": "Physical Dinosaur",
            "username": "physical_dinosaur",
          },
        },
        Object {
          "uid": "unknownId1",
        },
        Object {
          "uid": "unknownId2",
        },
      ]
    `);
  });
});
