/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiComboBoxTestHarness } from '@kbn/test-eui-helpers';

import { WithAppDependencies } from '../helpers/setup_environment';
import { MappingsEditor } from '../../../mappings_editor';
import { defaultDateRangeParameters } from './fixtures';
import { act } from 'react-dom/test-utils';

const onChangeHandler = jest.fn();

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Mappings editor: date range datatype', () => {
  test('should require a scaling factor to be provided', async () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'double_range',
        },
      },
    };

    const updatedMappings = { ...defaultMappings };

    const Component = WithAppDependencies(MappingsEditor, {});
    render(
      <I18nProvider>
        <Component value={defaultMappings} onChange={onChangeHandler} indexSettings={{}} />
      </I18nProvider>
    );

    // Wait for editor to render
    await screen.findByTestId('mappingsEditor');

    // Open the flyout to edit the field
    const editButton = screen.getByTestId('editFieldButton');
    fireEvent.click(editButton);

    // Wait for flyout to open
    const flyout = await screen.findByTestId('mappingsEditorFieldEdit');

    // Verify format parameter is not visible for double_range
    expect(screen.queryByTestId('formatParameter')).not.toBeInTheDocument();

    // Change the type to "date_range" using EuiComboBox harness
    // The label is "Date range" (from TYPE_DEFINITION)
    const fieldSubTypeComboBox = new EuiComboBoxTestHarness('fieldSubType');
    fieldSubTypeComboBox.selectOption('Date range');

    // Wait for format parameter to appear
    const formatParameter = await within(flyout).findByTestId('formatParameter');
    expect(formatParameter).toBeInTheDocument();

    // Format input should not be visible yet
    expect(within(flyout).queryByTestId('formatInput')).not.toBeInTheDocument();

    // Enable the format parameter toggle
    const formatToggle = within(formatParameter).getByTestId('formRowToggle');
    fireEvent.click(formatToggle);

    // Wait for toggle to be enabled and format input to appear
    await waitFor(() => {
      expect(formatToggle.getAttribute('aria-checked')).toBe('true');
    });

    await within(flyout).findByTestId('formatParameter');

    // Set custom format value using EuiComboBox harness
    const formatComboBox = new EuiComboBoxTestHarness('formatInput');
    formatComboBox.selectOption('customDateFormat');

    // Save the field and close the flyout
    const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
    fireEvent.click(updateButton);

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    // Wait for onChange to be called
    await waitFor(() => {
      expect(onChangeHandler).toHaveBeenCalled();
    });

    // It should have the default parameters values added, plus the custom format appended
    // Real EuiComboBox allows custom options and appends them to existing values
    updatedMappings.properties.myField = {
      ...defaultDateRangeParameters,
      format: 'strict_date_optional_time||epoch_millis||customDateFormat',
    } as any;

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    const [callData] = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1];
    const actualMappings = callData.getData();
    expect(actualMappings).toEqual(updatedMappings);
  });
});
