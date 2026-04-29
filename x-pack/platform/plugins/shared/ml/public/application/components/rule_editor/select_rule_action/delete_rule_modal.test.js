/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { fireEvent, screen } from '@testing-library/react';

import { DeleteRuleModal } from './delete_rule_modal';

describe('DeleteRuleModal', () => {
  const deleteRuleAtIndex = jest.fn();

  const requiredProps = {
    ruleIndex: 0,
    deleteRuleAtIndex,
  };

  test('renders as delete button when not visible', () => {
    const { container } = renderWithI18n(<DeleteRuleModal {...requiredProps} />);

    expect(container.firstChild).toMatchSnapshot();
  });

  test('renders modal after clicking delete rule link', () => {
    const { container } = renderWithI18n(<DeleteRuleModal {...requiredProps} />);

    // Find and click the delete link
    const deleteLink = screen.getByTestId('deleteRuleModalLink');
    fireEvent.click(deleteLink);

    // Modal should be visible now
    expect(container.firstChild).toMatchSnapshot();
  });

  test('renders as delete button after opening and closing modal', () => {
    const { container } = renderWithI18n(<DeleteRuleModal {...requiredProps} />);

    // Open the modal
    const deleteLink = screen.getByTestId('deleteRuleModalLink');
    fireEvent.click(deleteLink);

    // Find and click the cancel button
    const cancelButton = screen.getByTestId('confirmModalCancelButton');
    fireEvent.click(cancelButton);

    // Modal should be closed now
    expect(container.firstChild).toMatchSnapshot();
  });

  test('calls deleteRuleAtIndex when confirm button is clicked', () => {
    renderWithI18n(<DeleteRuleModal {...requiredProps} />);

    // Open the modal
    const deleteLink = screen.getByTestId('deleteRuleModalLink');
    fireEvent.click(deleteLink);

    // Find and click the delete button
    const deleteButton = screen.getByTestId('confirmModalConfirmButton');
    fireEvent.click(deleteButton);

    // Verify the function was called with the correct index
    expect(deleteRuleAtIndex).toHaveBeenCalledWith(0);
  });
});
