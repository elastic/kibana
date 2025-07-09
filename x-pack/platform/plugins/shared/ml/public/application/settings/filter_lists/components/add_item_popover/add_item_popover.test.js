/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, fireEvent, waitFor } from '@testing-library/react';

import { AddItemPopover } from './add_item_popover';

function renderPopover(addItemsFn, canCreateFilter = true) {
  const props = {
    addItems: addItemsFn,
    canCreateFilter,
  };

  return renderWithI18n(<AddItemPopover {...props} />);
}

describe('AddItemPopover', () => {
  test('renders the popover', () => {
    const addItems = jest.fn();
    const { container } = renderPopover(addItems);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('opens the popover when clicking the button', async () => {
    const addItems = jest.fn();
    renderPopover(addItems);

    // Find and click the button to open the popover
    const button = screen.getByTestId('mlFilterListOpenNewItemsPopoverButton');
    fireEvent.click(button);

    // Wait for and verify the popover content is now visible
    await waitFor(() => {
      expect(screen.getByTestId('mlFilterListAddItemTextArea')).toBeInTheDocument();
    });
  });

  test('calls addItems with one item on clicking Add button', async () => {
    const addItems = jest.fn();
    renderPopover(addItems);

    // Open the popover
    const openButton = screen.getByTestId('mlFilterListOpenNewItemsPopoverButton');
    fireEvent.click(openButton);

    // Wait for the textarea to be visible
    await waitFor(() => {
      expect(screen.getByTestId('mlFilterListAddItemTextArea')).toBeInTheDocument();
    });

    // Enter text in the textarea
    const textarea = screen.getByTestId('mlFilterListAddItemTextArea');
    fireEvent.change(textarea, { target: { value: 'google.com' } });

    // Wait for the Add button to be enabled
    let addButton;
    await waitFor(() => {
      addButton = screen.getByTestId('mlFilterListAddItemsButton');
      expect(addButton).not.toBeDisabled();
    });

    // Click the Add button
    fireEvent.click(addButton);

    // Verify addItems was called with the correct value
    await waitFor(() => {
      expect(addItems).toHaveBeenCalledWith(['google.com']);
    });
  });

  test('calls addItems with multiple items on clicking Add button', async () => {
    const addItems = jest.fn();
    renderPopover(addItems);

    // Open the popover
    const openButton = screen.getByTestId('mlFilterListOpenNewItemsPopoverButton');
    fireEvent.click(openButton);

    // Wait for the textarea to be visible
    await waitFor(() => {
      expect(screen.getByTestId('mlFilterListAddItemTextArea')).toBeInTheDocument();
    });

    // Enter multiple items in the textarea (one per line)
    const textarea = screen.getByTestId('mlFilterListAddItemTextArea');
    fireEvent.change(textarea, { target: { value: 'google.com\nelastic.co' } });

    // Wait for the Add button to be enabled
    let addButton;
    await waitFor(() => {
      addButton = screen.getByTestId('mlFilterListAddItemsButton');
      expect(addButton).not.toBeDisabled();
    });

    // Click the Add button
    fireEvent.click(addButton);

    // Verify addItems was called with both items
    await waitFor(() => {
      expect(addItems).toHaveBeenCalledWith(['google.com', 'elastic.co']);
    });
  });

  test('button is disabled when canCreateFilter is false', async () => {
    const addItems = jest.fn();
    renderPopover(addItems, false);

    // Find the button and verify it's disabled
    await waitFor(() => {
      const button = screen.getByTestId('mlFilterListOpenNewItemsPopoverButton');
      expect(button).toBeDisabled();
    });
  });
});
