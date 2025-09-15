/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Create a mock for the canDeleteFilter privilege check.
// The mock is hoisted to the top, so need to prefix the mock function
// with 'mock' so it can be used lazily.
const mockCheckPermission = jest.fn(() => true);
jest.mock('../../../../capabilities/check_capabilities', () => ({
  checkPermission: (privilege) => mockCheckPermission(privilege),
}));
jest.mock('../../../../services/ml_api_service', () => 'ml');

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, fireEvent, waitFor } from '@testing-library/react';

import { DeleteFilterListModal } from './delete_filter_list_modal';

const testSelectedLists = [{ filter_id: 'web_domains' }, { filter_id: 'test_instances' }];

const testProps = {
  selectedFilterLists: testSelectedLists,
  canDeleteFilter: true,
};

describe('DeleteFilterListModal', () => {
  test('renders as disabled delete button when no lists selected', async () => {
    const emptyListsProps = {
      ...testProps,
      selectedFilterLists: [],
    };

    const { container } = renderWithI18n(<DeleteFilterListModal {...emptyListsProps} />);

    // Find the delete button
    const deleteButton = screen.getByTestId('mlFilterListsDeleteButton');

    // Verify it's disabled
    expect(deleteButton).toBeDisabled();

    // Take a snapshot of the rendered component
    expect(container.firstChild).toMatchSnapshot();
  });

  test('renders as enabled delete button when a list is selected', async () => {
    const { container } = renderWithI18n(<DeleteFilterListModal {...testProps} />);

    // Find the delete button
    const deleteButton = screen.getByTestId('mlFilterListsDeleteButton');

    // Verify it's enabled
    expect(deleteButton).not.toBeDisabled();

    // Take a snapshot of the rendered component
    expect(container.firstChild).toMatchSnapshot();
  });

  test('renders modal after clicking delete button', async () => {
    renderWithI18n(<DeleteFilterListModal {...testProps} />);

    // Find and click the delete button
    const deleteButton = screen.getByTestId('mlFilterListsDeleteButton');
    fireEvent.click(deleteButton);

    // Wait for the modal to appear
    await waitFor(() => {
      expect(screen.getByTestId('mlFilterListDeleteConfirmation')).toBeInTheDocument();
    });

    // Verify the modal content
    expect(screen.getByText('Delete 2 filter lists?')).toBeInTheDocument();
  });

  test('renders as delete button after opening and closing modal', async () => {
    renderWithI18n(<DeleteFilterListModal {...testProps} />);

    // Find and click the delete button to open the modal
    const deleteButton = screen.getByTestId('mlFilterListsDeleteButton');
    fireEvent.click(deleteButton);

    // Wait for the modal to appear
    await waitFor(() => {
      expect(screen.getByTestId('mlFilterListDeleteConfirmation')).toBeInTheDocument();
    });

    // Find and click the cancel button to close the modal
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Wait for the modal to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('mlFilterListDeleteConfirmation')).not.toBeInTheDocument();
    });

    // Verify the delete button is visible again
    expect(screen.getByTestId('mlFilterListsDeleteButton')).toBeInTheDocument();
  });
});

describe('DeleteFilterListModal false canDeleteFilter privilege', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('renders as disabled delete button', async () => {
    mockCheckPermission.mockImplementationOnce(() => false);

    const { container } = renderWithI18n(
      <DeleteFilterListModal {...testProps} canDeleteFilter={false} />
    );

    // Find the delete button
    const deleteButton = screen.getByTestId('mlFilterListsDeleteButton');

    // Verify it's disabled
    expect(deleteButton).toBeDisabled();

    // Take a snapshot of the rendered component
    expect(container.firstChild).toMatchSnapshot();
  });
});
