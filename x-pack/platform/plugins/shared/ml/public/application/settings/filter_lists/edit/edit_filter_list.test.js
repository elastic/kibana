/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { EditFilterList } from './edit_filter_list';

jest.mock('../../../components/help_menu', () => ({
  HelpMenu: () => <div id="mockHelpMenu" />,
}));

// Mock the call for loading the list of filters.
// The mock is hoisted to the top, so need to prefix the filter variable
// with 'mock' so it can be used lazily.
const mockTestFilter = {
  filter_id: 'safe_domains',
  description: 'List of known safe domains',
  items: ['google.com', 'google.co.uk', 'elastic.co', 'youtube.com'],
  used_by: {
    detectors: ['high info content'],
    jobs: ['dns_exfiltration'],
  },
};
const mockFilters = jest.fn().mockImplementation(() => Promise.resolve(mockTestFilter));
const mockKibanaContext = {
  services: {
    docLinks: { links: { ml: { customRules: 'test' } } },
    notifications: { toasts: { addDanger: jest.fn(), addError: jest.fn() } },
    mlServices: {
      mlApi: {
        filters: {
          filters: mockFilters,
        },
      },
    },
  },
};

const mockReact = React;
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  withKibana: (type) => {
    const EnhancedType = (props) => {
      return mockReact.createElement(type, {
        ...props,
        kibana: mockKibanaContext,
      });
    };
    return EnhancedType;
  },
}));

const props = {
  canCreateFilter: true,
  canDeleteFilter: true,
};

describe('EditFilterList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the edit page for a new filter list and updates ID', async () => {
    const { getByTestId, getByText } = render(
      <IntlProvider locale="en">
        <EditFilterList {...props} />
      </IntlProvider>
    );

    // The filter list should be empty.
    expect(getByText('No items have been added')).toBeInTheDocument();

    const mlNewFilterListIdInput = getByTestId('mlNewFilterListIdInput');
    expect(mlNewFilterListIdInput).toBeInTheDocument();

    await userEvent.type(mlNewFilterListIdInput, 'new_filter_list');

    await waitFor(() => {
      expect(mlNewFilterListIdInput).toHaveValue('new_filter_list');
    });

    // After entering a valid ID, the save button should be enabled.
    expect(getByTestId('mlFilterListSaveButton')).toBeEnabled();

    await userEvent.clear(mlNewFilterListIdInput);

    // Emptied again, the save button should be disabled.
    await waitFor(() => {
      expect(getByTestId('mlFilterListSaveButton')).toBeDisabled();
    });

    await userEvent.type(mlNewFilterListIdInput, '#invalid#$%^', { delay: 1 });

    await waitFor(() => {
      expect(mlNewFilterListIdInput).toHaveValue('#invalid#$%^');
    });

    // After entering an invalid ID, the save button should still be disabled.
    await waitFor(() => {
      expect(getByTestId('mlFilterListSaveButton')).toBeDisabled();
    });

    expect(mockFilters).toHaveBeenCalledTimes(0);
  });

  test('renders the edit page for an existing filter list and updates description', async () => {
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <EditFilterList {...props} filterId="safe_domains" />
      </IntlProvider>
    );

    expect(mockFilters).toHaveBeenCalledWith({ filterId: 'safe_domains' });

    await waitFor(() => {
      expect(getByTestId('mlNewFilterListDescriptionText')).toHaveTextContent(
        'List of known safe domains'
      );
    });

    const mlFilterListEditDescriptionButton = getByTestId('mlFilterListEditDescriptionButton');

    expect(mlFilterListEditDescriptionButton).toBeInTheDocument();

    // Workaround with `pointerEventsCheck` so we don't get "Error: unable to click element as it has or inherits pointer-events set to "none"."
    await userEvent.click(mlFilterListEditDescriptionButton, { pointerEventsCheck: 0 });

    const mlFilterListDescriptionInput = getByTestId('mlFilterListDescriptionInput');

    await waitFor(() => {
      expect(mlFilterListDescriptionInput).toBeInTheDocument();
      expect(mlFilterListDescriptionInput).toHaveValue('List of known safe domains');
    });

    await userEvent.clear(mlFilterListDescriptionInput);
    await userEvent.type(mlFilterListDescriptionInput, 'Known safe web domains');
    await userEvent.click(mlFilterListEditDescriptionButton);

    await waitFor(() => {
      expect(getByTestId('mlNewFilterListDescriptionText')).toHaveTextContent(
        'Known safe web domains'
      );
    });
  });

  test('updates the items per page', async () => {
    const { findByText, findByTestId, getByTestId, queryByText } = render(
      <IntlProvider locale="en">
        <EditFilterList {...props} filterId="safe_domains" />
      </IntlProvider>
    );

    expect(mockFilters).toHaveBeenCalledWith({ filterId: 'safe_domains' });

    // Use findByText to be able to wait for the page to be updated.
    expect(await findByText('Items per page: 50')).toBeInTheDocument();

    const mlItemsGridPaginationPopover = getByTestId('mlItemsGridPaginationPopover');
    expect(mlItemsGridPaginationPopover).toBeInTheDocument();

    // Click to open the popover
    await userEvent.click(mlItemsGridPaginationPopover.querySelector('button'));

    // Use findByText to be able to wait for the page to be updated.
    expect(await findByTestId('mlItemsGridPaginationMenuPanel')).toBeInTheDocument();
    // The popover should include the option for 500 items.
    expect(await findByText('500 items')).toBeInTheDocument();

    // Next we want to click the '500 items' button.
    const mlItemsGridPaginationMenuPanel = getByTestId('mlItemsGridPaginationMenuPanel');
    const buttons = within(mlItemsGridPaginationMenuPanel).getAllByRole('button');
    expect(buttons.length).toBe(4);
    await userEvent.click(buttons[2]);

    // Use findByText to be able to wait for the page to be updated.
    expect(await queryByText('Items per page: 50')).not.toBeInTheDocument();
    expect(await findByText('Items per page: 500')).toBeInTheDocument();
  });

  test('renders after selecting an item and deleting it', async () => {
    const { findByText, getAllByTestId, getByTestId, queryByText } = render(
      <IntlProvider locale="en">
        <EditFilterList {...props} filterId="safe_domains" />
      </IntlProvider>
    );

    expect(mockFilters).toHaveBeenCalledWith({ filterId: 'safe_domains' });

    // Use findByText to be able to wait for the page to be updated.
    expect(await findByText('google.com')).toBeInTheDocument();
    expect(await findByText('google.co.uk')).toBeInTheDocument();
    expect(await findByText('elastic.co')).toBeInTheDocument();
    expect(await findByText('youtube.com')).toBeInTheDocument();

    const checkboxes = getAllByTestId('mlGridItemCheckbox');
    expect(checkboxes.length).toBe(4);

    // Click the checkbox for google.co.uk and then the delete button.
    await userEvent.click(checkboxes[1]);
    await userEvent.click(getByTestId('mlFilterListDeleteItemButton'));

    expect(await findByText('google.com')).toBeInTheDocument();
    expect(await queryByText('google.co.uk')).not.toBeInTheDocument();
    expect(await findByText('elastic.co')).toBeInTheDocument();
    expect(await findByText('youtube.com')).toBeInTheDocument();
    expect(getAllByTestId('mlGridItemCheckbox')).toHaveLength(3);
  });

  test('adds new items to filter list', async () => {
    const { getByTestId, getByText, findByText, findByTestId, queryByTestId, queryByText } = render(
      <IntlProvider locale="en">
        <EditFilterList {...props} filterId="safe_domains" />
      </IntlProvider>
    );

    expect(mockFilters).toHaveBeenCalledWith({ filterId: 'safe_domains' });

    // Use findByText to be able to wait for the page to be updated.
    expect(await findByText('google.com')).toBeInTheDocument();
    expect(await findByText('google.co.uk')).toBeInTheDocument();
    expect(await findByText('elastic.co')).toBeInTheDocument();
    expect(await findByText('youtube.com')).toBeInTheDocument();
    expect(await queryByText('amazon.com')).not.toBeInTheDocument();
    expect(await queryByText('spotify.com')).not.toBeInTheDocument();

    const mlFilterListOpenNewItemsPopoverButton = queryByTestId(
      'mlFilterListOpenNewItemsPopoverButton'
    );
    expect(mlFilterListOpenNewItemsPopoverButton).toBeInTheDocument();
    await userEvent.click(mlFilterListOpenNewItemsPopoverButton);

    // Assert that the popover was opened.
    expect(await findByTestId('mlFilterListAddItemPopoverContent')).toBeInTheDocument();

    // Assert that the textarea is present and empty.
    const mlFilterListAddItemTextArea = getByTestId('mlFilterListAddItemTextArea');
    expect(mlFilterListAddItemTextArea).toBeInTheDocument();
    expect(mlFilterListAddItemTextArea).toHaveValue('');

    // Assert that the add items button prenset but disabled.
    const mlFilterListAddItemsButton = getByTestId('mlFilterListAddItemsButton');
    expect(mlFilterListAddItemsButton).toBeInTheDocument();
    expect(mlFilterListAddItemsButton).toBeDisabled();

    // Enter items in the textarea and click the add items button
    await userEvent.type(mlFilterListAddItemTextArea, 'amazon.com\nspotify.com');
    await userEvent.click(mlFilterListAddItemsButton);

    // Assert that the popover is closed again
    expect(await queryByTestId('mlFilterListAddItemPopover')).not.toBeInTheDocument();

    // Assert that the item grid has been updated.
    expect(getByText('google.com')).toBeInTheDocument();
    expect(getByText('google.co.uk')).toBeInTheDocument();
    expect(getByText('elastic.co')).toBeInTheDocument();
    expect(getByText('youtube.com')).toBeInTheDocument();
    expect(getByText('amazon.com')).toBeInTheDocument();
    expect(getByText('spotify.com')).toBeInTheDocument();
  });
});
