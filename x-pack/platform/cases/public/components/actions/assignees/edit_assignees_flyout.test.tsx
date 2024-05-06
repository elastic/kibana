/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { basicCase } from '../../../containers/mock';
import { EditAssigneesFlyout } from './edit_assignees_flyout';
import { screen, waitFor } from '@testing-library/react';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import { userProfiles, userProfilesMap } from '../../../containers/user_profiles/api.mock';

jest.mock('../../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../../containers/user_profiles/use_suggest_user_profiles');

const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;
const useSuggestUserProfilesMock = useSuggestUserProfiles as jest.Mock;

describe('EditAssigneesFlyout', () => {
  let appMock: AppMockRenderer;

  const props = {
    selectedCases: [basicCase],
    onClose: jest.fn(),
    onSaveAssignees: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMock = createAppMockRenderer();

    useBulkGetUserProfilesMock.mockReturnValue({ data: userProfilesMap, isLoading: false });
    useSuggestUserProfilesMock.mockReturnValue({ data: userProfiles, isLoading: false });
  });

  it('renders correctly', async () => {
    appMock.render(<EditAssigneesFlyout {...props} />);

    expect(await screen.findByTestId('cases-edit-assignees-flyout')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-edit-assignees-flyout-title')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-edit-assignees-flyout-cancel')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-edit-assignees-flyout-submit')).toBeInTheDocument();
  });

  it('calls onClose when pressing the cancel button', async () => {
    appMock.render(<EditAssigneesFlyout {...props} />);

    userEvent.click(await screen.findByTestId('cases-edit-assignees-flyout-cancel'));

    await waitFor(() => {
      expect(props.onClose).toHaveBeenCalled();
    });
  });

  it('calls onSaveAssignees when pressing the save selection button', async () => {
    appMock.render(<EditAssigneesFlyout {...props} />);

    expect(await screen.findByText('Damaged Raccoon')).toBeInTheDocument();

    userEvent.click(await screen.findByText('Damaged Raccoon'));
    userEvent.click(await screen.findByTestId('cases-edit-assignees-flyout-submit'));

    await waitFor(() => {
      expect(props.onSaveAssignees).toHaveBeenCalledWith({
        selectedItems: [],
        unSelectedItems: ['u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0'],
      });
    });
  });

  it('shows the case title when selecting one case', async () => {
    appMock.render(<EditAssigneesFlyout {...props} />);

    expect(await screen.findByText(basicCase.title)).toBeInTheDocument();
  });

  it('shows the number of total selected cases in the title  when selecting multiple cases', async () => {
    appMock.render(<EditAssigneesFlyout {...props} selectedCases={[basicCase, basicCase]} />);

    expect(await screen.findByText('Selected cases: 2')).toBeInTheDocument();
  });
});
