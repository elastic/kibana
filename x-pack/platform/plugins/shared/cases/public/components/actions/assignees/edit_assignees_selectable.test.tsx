/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, screen } from '@testing-library/react';

import { renderWithTestingProviders } from '../../../common/mock';
import { EditAssigneesSelectable } from './edit_assignees_selectable';
import { basicCase } from '../../../containers/mock';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { userProfiles, userProfilesMap } from '../../../containers/user_profiles/api.mock';
import * as api from '../../../containers/user_profiles/api';

jest.mock('../../../containers/user_profiles/api');

describe('EditAssigneesSelectable', () => {
  let user: UserEvent;

  /**
   * Case has the following tags: Damaged Raccoon
   * All available tags are: Damaged Raccoon, Physical Dinosaur, Wet Dingo
   */
  const props = {
    selectedCases: [basicCase],
    isLoading: false,
    onChangeAssignees: jest.fn(),
  };

  /**
   * Case one has the following assignees: Damaged Raccoon
   * Case two has the following assignees: Damaged Raccoon, Physical Dinosaur
   * All available assignees are: Damaged Raccoon, Physical Dinosaur, Wet Dingo, Silly Hare, Convenient Orca
   */
  const propsMultipleCases = {
    selectedCases: [
      basicCase,
      { ...basicCase, assignees: [...basicCase.assignees, { uid: userProfiles[1].uid }] },
    ],
    isLoading: false,
    onChangeAssignees: jest.fn(),
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });

    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(<EditAssigneesSelectable {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Find a user')).toBeInTheDocument();
    expect(screen.getByText('Selected: 1')).toBeInTheDocument();

    for (const userProfile of userProfiles) {
      // @ts-ignore: full name exists
      expect(screen.getByText(userProfile.user.full_name)).toBeInTheDocument();
    }
  });

  it('renders the selected assignees label correctly', async () => {
    renderWithTestingProviders(<EditAssigneesSelectable {...propsMultipleCases} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    expect(screen.getByText('Selected: 2')).toBeInTheDocument();

    for (const userProfile of userProfilesMap.values()) {
      // @ts-ignore: full name exists
      expect(screen.getByText(userProfile.user.full_name)).toBeInTheDocument();
    }
  });

  it('renders the assignees icons correctly', async () => {
    renderWithTestingProviders(<EditAssigneesSelectable {...propsMultipleCases} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    for (const [uid, icon] of [
      [userProfiles[0].uid, 'check'],
      [userProfiles[1].uid, 'asterisk'],
      [userProfiles[2].uid, 'empty'],
    ]) {
      const iconDataTestSubj = `cases-actions-assignees-edit-selectable-assignee-${uid}-icon-${icon}`;
      expect(screen.getByTestId(iconDataTestSubj)).toBeInTheDocument();
    }
  });

  it('selects and unselects correctly assignees with one case', async () => {
    renderWithTestingProviders(<EditAssigneesSelectable {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    for (const userProfile of userProfiles) {
      // @ts-ignore: full name exists
      await user.click(screen.getByText(userProfile.user.full_name));
    }

    expect(props.onChangeAssignees).toBeCalledTimes(3);
    expect(props.onChangeAssignees).nthCalledWith(3, {
      selectedItems: [
        'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
        'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0',
      ],
      unSelectedItems: ['u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0'],
    });
  });

  it('selects and unselects correctly assignees with multiple cases', async () => {
    renderWithTestingProviders(<EditAssigneesSelectable {...propsMultipleCases} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    for (const userProfile of userProfiles) {
      // @ts-ignore: full name exists
      await user.click(screen.getByText(userProfile.user.full_name));
    }

    expect(propsMultipleCases.onChangeAssignees).toBeCalledTimes(3);
    expect(propsMultipleCases.onChangeAssignees).nthCalledWith(3, {
      selectedItems: [
        'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
        'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0',
      ],
      unSelectedItems: ['u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0'],
    });
  });

  it('renders the icons correctly after selecting and deselecting assignees', async () => {
    renderWithTestingProviders(<EditAssigneesSelectable {...propsMultipleCases} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    for (const userProfile of userProfiles) {
      // @ts-ignore: full name exists
      await user.click(screen.getByText(userProfile.user.full_name));
    }

    for (const [uid, icon] of [
      [userProfiles[0].uid, 'empty'],
      [userProfiles[1].uid, 'check'],
      [userProfiles[2].uid, 'check'],
    ]) {
      const iconDataTestSubj = `cases-actions-assignees-edit-selectable-assignee-${uid}-icon-${icon}`;
      expect(screen.getByTestId(iconDataTestSubj)).toBeInTheDocument();
    }

    expect(propsMultipleCases.onChangeAssignees).toBeCalledTimes(3);
    expect(propsMultipleCases.onChangeAssignees).nthCalledWith(3, {
      selectedItems: [
        'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
        'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0',
      ],
      unSelectedItems: ['u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0'],
    });
  });

  it('sort users alphabetically correctly', async () => {
    const spyOnBulkGetUserProfiles = jest.spyOn(api, 'bulkGetUserProfiles');
    const reversedUserProfiles = [...userProfiles].reverse();
    spyOnBulkGetUserProfiles.mockResolvedValueOnce(reversedUserProfiles);

    renderWithTestingProviders(<EditAssigneesSelectable {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    const allUsersInView = screen.getAllByRole('option');
    expect(allUsersInView.length).toBe(3);

    expect(allUsersInView[0].textContent?.includes('Damaged Raccoon')).toBe(true);
    expect(allUsersInView[1].textContent?.includes('Physical Dinosaur')).toBe(true);
    expect(allUsersInView[2].textContent?.includes('Wet Dingo')).toBe(true);
  });

  it('search and sorts alphabetically', async () => {
    // Silly Hare
    const searchedUserDataTestSubj =
      'cases-actions-assignees-edit-selectable-assignee-u_IbBVXpDtrjOByJ-syBdr425fLGqwpzY_xdQqCFAFXLI_0';

    renderWithTestingProviders(<EditAssigneesSelectable {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Find a user'), 's');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByTestId(searchedUserDataTestSubj));
    });

    const searchResults = screen.getAllByRole('option');

    expect(searchResults.length).toBe(2);
    expect(searchResults[0].textContent?.includes('Physical Dinosaur')).toBe(true);
    expect(searchResults[1].textContent?.includes('Silly Hare')).toBe(true);
  });

  it('selecting and deselecting a searched user does not show it after the user cleared the search', async () => {
    // Silly Hare
    const searchedUserDataTestSubj =
      'cases-actions-assignees-edit-selectable-assignee-u_IbBVXpDtrjOByJ-syBdr425fLGqwpzY_xdQqCFAFXLI_0';

    renderWithTestingProviders(<EditAssigneesSelectable {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Find a user'), 's');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByTestId(searchedUserDataTestSubj));
    });

    // selects
    await user.click(screen.getByTestId(searchedUserDataTestSubj));
    // deselect
    await user.click(screen.getByTestId(searchedUserDataTestSubj));
    // clear search results
    await user.click(screen.getByTestId('clearSearchButton'));

    await waitFor(() => {
      expect(screen.getByText('Damaged Raccoon'));
    });

    expect(screen.queryByTestId(searchedUserDataTestSubj)).not.toBeInTheDocument();
  });

  it('does not show the same user in search results if it is already in the initial user profile mapping', async () => {
    renderWithTestingProviders(<EditAssigneesSelectable {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Find a user'), 's');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const searchResults = screen.getAllByTestId(
      // Physical Dinosaur
      'cases-actions-assignees-edit-selectable-assignee-u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0-icon-empty'
    );

    expect(searchResults.length).toBe(1);
  });

  it('selects a searched user correctly', async () => {
    // Silly Hare
    const searchedUserDataTestSubj =
      'cases-actions-assignees-edit-selectable-assignee-u_IbBVXpDtrjOByJ-syBdr425fLGqwpzY_xdQqCFAFXLI_0';

    renderWithTestingProviders(<EditAssigneesSelectable {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Find a user'), 's');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByTestId(searchedUserDataTestSubj));
    });

    await user.click(screen.getByTestId(searchedUserDataTestSubj));
    expect(props.onChangeAssignees).toBeCalledWith({
      selectedItems: [
        'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        'u_IbBVXpDtrjOByJ-syBdr425fLGqwpzY_xdQqCFAFXLI_0',
      ],
      unSelectedItems: [],
    });
  });

  it('shows deselected users from the initial user profile mapping', async () => {
    renderWithTestingProviders(<EditAssigneesSelectable {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    // @ts-ignore: full name exists
    await user.click(screen.getByText(userProfiles[0].user.full_name));

    // @ts-ignore: full name exists
    expect(screen.getByText(userProfiles[0].user.full_name)).toBeInTheDocument();
    // ensures that the icon is set to empty
    expect(
      screen.getByTestId(
        'cases-actions-assignees-edit-selectable-assignee-u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0-icon-empty'
      )
    ).toBeInTheDocument();

    expect(props.onChangeAssignees).toBeCalledWith({
      selectedItems: [],
      unSelectedItems: ['u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0'],
    });
  });

  it('does not shows initial empty search results on the list of users', async () => {
    // Silly Hare
    const searchedUserDataTestSubj =
      'cases-actions-assignees-edit-selectable-assignee-u_IbBVXpDtrjOByJ-syBdr425fLGqwpzY_xdQqCFAFXLI_0';

    renderWithTestingProviders(<EditAssigneesSelectable {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByText('Damaged Raccoon'));
    });

    expect(screen.queryByTestId(searchedUserDataTestSubj)).not.toBeInTheDocument();
  });

  it('shows the no matching component', async () => {
    renderWithTestingProviders(<EditAssigneesSelectable {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Find a user'), 'not-exists');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(
        screen.getAllByTestId('case-user-profiles-assignees-popover-no-matches')[0]
      ).toBeInTheDocument();
    });
  });

  it('shows unknown users', async () => {
    const selectedCases = [{ ...basicCase, assignees: [{ uid: '123' }, { uid: '456' }] }];
    renderWithTestingProviders(
      <EditAssigneesSelectable {...props} selectedCases={selectedCases} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    await waitFor(() => {
      const unknownUsers = screen.getAllByText('Unknown');
      expect(unknownUsers.length).toBe(2);
    });
  });

  it('selects unknown users', async () => {
    const selectedCases = [{ ...basicCase, assignees: [{ uid: '123' }] }, basicCase];
    renderWithTestingProviders(
      <EditAssigneesSelectable {...props} selectedCases={selectedCases} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Unknown'));

    expect(props.onChangeAssignees).toBeCalledWith({
      selectedItems: ['123'],
      unSelectedItems: [],
    });
  });

  it('deselects unknown users', async () => {
    const selectedCases = [{ ...basicCase, assignees: [{ uid: '123' }] }];
    renderWithTestingProviders(
      <EditAssigneesSelectable {...props} selectedCases={selectedCases} />
    );

    await waitFor(() => {
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Unknown'));

    expect(props.onChangeAssignees).toBeCalledWith({
      selectedItems: [],
      unSelectedItems: ['123'],
    });
  });

  it('remove all assignees', async () => {
    renderWithTestingProviders(<EditAssigneesSelectable {...propsMultipleCases} />);

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Remove all assignees' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove all assignees' }));

    expect(propsMultipleCases.onChangeAssignees).toBeCalledTimes(1);
    expect(propsMultipleCases.onChangeAssignees).toBeCalledWith({
      selectedItems: [],
      unSelectedItems: [
        'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
      ],
    });
  });

  it('renders even with no assignee set yet', async () => {
    const selectedCases = [{ ...basicCase, assignees: [] }];
    renderWithTestingProviders(
      <EditAssigneesSelectable {...props} selectedCases={selectedCases} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('cases-actions-assignees-edit-selectable')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Find a user')).toBeInTheDocument();
    expect(screen.getByText('Selected: 0')).toBeInTheDocument();
  });
});
