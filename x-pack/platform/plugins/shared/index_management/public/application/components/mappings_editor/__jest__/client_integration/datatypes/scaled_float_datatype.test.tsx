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

// Parameters automatically added to the scaled float datatype when saved (with the default values)
export const defaultScaledFloatParameters = {
  type: 'scaled_float',
  coerce: true,
  doc_values: true,
  ignore_malformed: false,
  index: true,
  store: false,
};

const onChangeHandler = jest.fn();
describe('Mappings editor: scaled float datatype', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  interface Mappings {
    properties: Record<string, Record<string, unknown>>;
  }

  test('should require a scaling factor to be provided', async () => {
    const defaultMappings: Mappings = {
      properties: {
        myField: {
          type: 'byte',
        },
      },
    };

    const updatedMappings: Mappings = {
      ...defaultMappings,
      properties: { ...defaultMappings.properties },
    };

    const Component = WithAppDependencies(MappingsEditor, {});
    render(
      <I18nProvider>
        <Component value={defaultMappings} onChange={onChangeHandler} indexSettings={{}} />
      </I18nProvider>
    );

    await screen.findByTestId('mappingsEditor');

    // Open the flyout to edit the field
    const editButton = screen.getByTestId('editFieldButton');
    fireEvent.click(editButton);

    const flyout = await screen.findByTestId('mappingsEditorFieldEdit');

    // Change the type to "scaled_float" using EuiComboBox harness
    // The label is "Scaled float" (from TYPE_DEFINITION)
    const fieldSubTypeComboBox = new EuiComboBoxTestHarness('fieldSubType');
    await fieldSubTypeComboBox.select('Scaled float');

    // Close the combobox popover (portal) before continuing.
    await fieldSubTypeComboBox.close();

    await within(flyout).findByTestId('scalingFactor');

    // Try to save without providing scaling factor - should show error
    let updateButton = within(flyout).getByTestId('editFieldUpdateButton');
    fireEvent.click(updateButton);

    // Flyout should still be open (form validation prevented save)
    await waitFor(() => {
      expect(screen.getByTestId('mappingsEditorFieldEdit')).toBeInTheDocument();
    });

    // Error message should be visible
    const errorMessage = await within(flyout).findByText('A scaling factor is required.');
    expect(errorMessage).toBeInTheDocument();

    // Now provide the scaling factor - find the input within the scalingFactor field
    const scalingFactorField = within(flyout).getByTestId('scalingFactor');
    const scalingFactorInput = within(scalingFactorField).getByRole('spinbutton');
    fireEvent.change(scalingFactorInput, { target: { value: '123' } });

    await waitFor(() => {
      const button = within(flyout).getByTestId('editFieldUpdateButton');
      expect(button).not.toBeDisabled();
    });

    // Now save should work
    updateButton = within(flyout).getByTestId('editFieldUpdateButton');
    fireEvent.click(updateButton);

    // Flyout should close
    await waitFor(() => {
      expect(screen.queryByTestId('mappingsEditorFieldEdit')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(onChangeHandler).toHaveBeenCalled();
    });

    // It should have the default parameters values added, plus the scaling factor
    updatedMappings.properties.myField = {
      ...defaultScaledFloatParameters,
      scaling_factor: 123,
    };

    const [callData] = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1];
    const actualMappings = callData.getData();
    expect(actualMappings).toEqual(updatedMappings);
  }, 20000);
});
