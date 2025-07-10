/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, fireEvent, waitFor } from '@testing-library/react';

import { EditDescriptionPopover } from './edit_description_popover';

describe('FilterListUsagePopover', () => {
  const defaultDescription = 'A list of known safe domains';
  test('renders the popover with no description', () => {
    const updateDescription = jest.fn();
    const props = {
      updateDescription,
      canCreateFilter: true,
    };

    const { container } = renderWithI18n(<EditDescriptionPopover {...props} />);

    expect(container.firstChild).toMatchSnapshot();
  });

  test('renders the popover with a description', () => {
    const updateDescription = jest.fn();
    const props = {
      description: defaultDescription,
      updateDescription,
      canCreateFilter: true,
    };

    const { container } = renderWithI18n(<EditDescriptionPopover {...props} />);

    expect(container.firstChild).toMatchSnapshot();
  });

  test('opens the popover when clicking the button', async () => {
    const updateDescription = jest.fn();
    const props = {
      description: defaultDescription,
      updateDescription,
      canCreateFilter: true,
    };

    renderWithI18n(<EditDescriptionPopover {...props} />);

    const editButton = screen.getByTestId('mlFilterListEditDescriptionButton');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByTestId('mlFilterListDescriptionInput')).toBeInTheDocument();
    });

    // Verify the input has the correct initial value
    const input = screen.getByTestId('mlFilterListDescriptionInput');
    expect(input.value).toBe(defaultDescription);
  });

  test('calls updateDescription when closing the popover', async () => {
    const updateDescription = jest.fn();
    const props = {
      description: defaultDescription,
      updateDescription,
      canCreateFilter: true,
    };

    renderWithI18n(<EditDescriptionPopover {...props} />);

    const editButton = screen.getByTestId('mlFilterListEditDescriptionButton');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByTestId('mlFilterListDescriptionInput')).toBeInTheDocument();
    });

    // Change the description
    const input = screen.getByTestId('mlFilterListDescriptionInput');
    fireEvent.change(input, { target: { value: 'Updated description' } });

    // Click outside to close the popover (simulated by calling EuiPopover's closePopover prop)
    // In RTL, we can't easily click outside, so we'll click the button again to close it
    fireEvent.click(editButton);

    // Verify updateDescription was called with the new value
    await waitFor(() => {
      expect(updateDescription).toHaveBeenCalledWith('Updated description');
    });
  });
});
