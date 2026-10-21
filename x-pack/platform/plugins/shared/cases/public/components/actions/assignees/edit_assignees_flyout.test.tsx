/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';

import { renderWithTestingProviders } from '../../../common/mock';
import { basicCase } from '../../../containers/mock';
import { EditAssigneesFlyout } from './edit_assignees_flyout';
import { screen } from '@testing-library/react';
import type { ItemsSelectionState } from '../types';

const mockUnSelectedAssignee = 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0';

jest.mock('./edit_assignees_selectable', () => ({
  EditAssigneesSelectable: ({
    onChangeAssignees,
  }: {
    onChangeAssignees: (args: ItemsSelectionState) => void;
  }) => (
    <button
      type="button"
      data-test-subj="cases-edit-assignees-selectable-mock"
      onClick={() =>
        onChangeAssignees({ selectedItems: [], unSelectedItems: [mockUnSelectedAssignee] })
      }
    >
      {'Change assignees'}
    </button>
  ),
}));

describe('EditAssigneesFlyout', () => {
  const props = {
    selectedCases: [basicCase],
    onClose: jest.fn(),
    onSaveAssignees: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    renderWithTestingProviders(<EditAssigneesFlyout {...props} />);

    expect(screen.getByTestId('cases-edit-assignees-flyout')).toBeInTheDocument();
    expect(screen.getByTestId('cases-edit-assignees-flyout-title')).toBeInTheDocument();
    expect(screen.getByTestId('cases-edit-assignees-flyout-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('cases-edit-assignees-flyout-submit')).toBeInTheDocument();
  });

  it('calls onClose when pressing the cancel button', async () => {
    renderWithTestingProviders(<EditAssigneesFlyout {...props} />);

    await userEvent.click(screen.getByTestId('cases-edit-assignees-flyout-cancel'));

    expect(props.onClose).toHaveBeenCalled();
  });

  it('calls onSaveAssignees when pressing the save selection button', async () => {
    renderWithTestingProviders(<EditAssigneesFlyout {...props} />);

    await userEvent.click(screen.getByTestId('cases-edit-assignees-selectable-mock'));
    await userEvent.click(screen.getByTestId('cases-edit-assignees-flyout-submit'));

    expect(props.onSaveAssignees).toHaveBeenCalledWith({
      selectedItems: [],
      unSelectedItems: [mockUnSelectedAssignee],
    });
  });

  it('shows the case title when selecting one case', () => {
    renderWithTestingProviders(<EditAssigneesFlyout {...props} />);

    expect(screen.getByText(basicCase.title)).toBeInTheDocument();
  });

  it('shows the number of total selected cases in the title  when selecting multiple cases', () => {
    renderWithTestingProviders(
      <EditAssigneesFlyout {...props} selectedCases={[basicCase, basicCase]} />
    );

    expect(screen.getByText('Selected cases: 2')).toBeInTheDocument();
  });
});
