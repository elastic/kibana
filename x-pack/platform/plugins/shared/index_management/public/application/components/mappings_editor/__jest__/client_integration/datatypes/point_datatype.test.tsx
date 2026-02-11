/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { WithAppDependencies } from '../helpers/setup_environment';
import { MappingsEditor } from '../../../mappings_editor';

// Parameters automatically added to the point datatype when saved (with the default values)
export const defaultPointParameters = {
  type: 'point',
  ignore_malformed: false,
  ignore_z_value: true,
};

const onChangeHandler = jest.fn();
describe('Mappings editor: point datatype', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initial view and default parameters values', async () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'point',
        },
      },
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

    // Update the name of the field
    const nameInput = within(flyout).getByTestId('nameParameterInput');
    fireEvent.change(nameInput, { target: { value: 'updatedField' } });

    // Save the field and close the flyout
    const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(onChangeHandler).toHaveBeenCalled();
    });

    // It should have the default parameters values added for fields which are not set
    const updatedMappings = {
      properties: {
        updatedField: {
          ...defaultPointParameters,
        },
      },
    };

    const [callData] = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1];
    const actualMappings = callData.getData();
    expect(actualMappings).toEqual(updatedMappings);
  });

  describe('meta parameter', () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'point',
        },
      },
    };

    const metaParameter = {
      meta: {
        my_metadata: 'foobar',
      },
    };

    test('valid meta object', async () => {
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

      // Show advanced settings
      const advancedSettingsToggle = within(flyout).getByTestId('toggleAdvancedSetting');
      fireEvent.click(advancedSettingsToggle);

      await waitFor(() => {
        const advancedSettings = within(flyout).getByTestId('advancedSettings');
        expect(advancedSettings.style.display).not.toBe('none');
      });

      // Enable the meta parameter toggle
      const metaParameterSection = within(flyout).getByTestId('metaParameter');
      const metaToggle = within(metaParameterSection).getByTestId('formRowToggle');
      fireEvent.click(metaToggle);

      await waitFor(() => {
        expect(metaToggle.getAttribute('aria-checked')).toBe('true');
      });

      const metaEditor = await within(flyout).findByTestId('metaParameterEditor');
      const metaValue = JSON.stringify(metaParameter.meta);

      // Set the value property and data-currentvalue attribute
      Object.defineProperty(metaEditor, 'value', {
        writable: true,
        value: metaValue,
      });

      metaEditor.setAttribute('data-currentvalue', metaValue);

      // Trigger change event
      fireEvent.change(metaEditor, { target: { value: metaValue } });

      await waitFor(() => {
        const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
        expect(updateButton).not.toBeDisabled();
      });

      // Click update button
      const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(onChangeHandler).toHaveBeenCalled();
      });

      // It should have the default parameters values added, plus metadata
      const updatedMappings = {
        properties: {
          myField: {
            ...defaultPointParameters,
            ...metaParameter,
          },
        },
      };

      const [callData] = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1];
      const actualMappings = callData.getData();
      expect(actualMappings).toEqual(updatedMappings);
    });

    test('strip empty string', async () => {
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

      // Show advanced settings
      const advancedSettingsToggle = within(flyout).getByTestId('toggleAdvancedSetting');
      fireEvent.click(advancedSettingsToggle);

      await waitFor(() => {
        const advancedSettings = within(flyout).getByTestId('advancedSettings');
        expect(advancedSettings.style.display).not.toBe('none');
      });

      // Enable the meta parameter toggle
      const metaParameterSection = within(flyout).getByTestId('metaParameter');
      const metaToggle = within(metaParameterSection).getByTestId('formRowToggle');
      fireEvent.click(metaToggle);

      await waitFor(() => {
        expect(metaToggle.getAttribute('aria-checked')).toBe('true');
      });

      // Don't set any value for meta parameter - just save

      // Click update button
      const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(onChangeHandler).toHaveBeenCalled();
      });

      // It should have only the type (meta parameter was enabled but empty, so it's stripped)
      // When meta is enabled but not set, defaults are not applied
      const updatedMappings = {
        properties: {
          myField: {
            type: 'point',
          },
        },
      };

      const [callData] = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1];
      const actualMappings = callData.getData();
      expect(actualMappings).toEqual(updatedMappings);
    });
  });
});
