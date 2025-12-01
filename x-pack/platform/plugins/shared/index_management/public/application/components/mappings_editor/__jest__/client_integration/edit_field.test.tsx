/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiComboBoxTestHarness } from '@kbn/test-eui-helpers';

import { MappingsEditor } from '../../mappings_editor';
import { WithAppDependencies } from './helpers/setup_environment';
import { defaultTextParameters } from './datatypes/fixtures';
import { defaultDateRangeParameters } from './datatypes/fixtures';

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

describe('Mappings editor: edit field', () => {
  const setup = (props: any) => {
    const Component = WithAppDependencies(MappingsEditor, {});
    return render(
      <I18nProvider>
        <Component {...props} />
      </I18nProvider>
    );
  };

  test('should open a flyout with the correct field to edit', async () => {
    const defaultMappings = {
      properties: {
        user: {
          type: 'object',
          properties: {
            address: {
              type: 'object',
              properties: {
                street: { type: 'text' },
              },
            },
          },
        },
      },
    };

    setup({ value: defaultMappings, onChange: onChangeHandler, indexSettings: {} });

    await screen.findByTestId('mappingsEditor');

    // Wait for fields to render
    await screen.findByTestId('fieldsList');

    // Find all field list items
    const allFields = screen.getAllByTestId(/fieldsListItem/);

    // The user field should be the first root-level field
    const userField = allFields.find((el) => el.textContent?.includes('user'));
    expect(userField).toBeDefined();

    // Expand user field
    const userExpandButton = within(userField!).getByTestId('toggleExpandButton');
    fireEvent.click(userExpandButton);

    // Wait for address field to appear
    const addressField = await screen.findByText('address', {
      selector: '[data-test-subj*="fieldName"]',
    });
    const addressListItem = addressField.closest(
      '[data-test-subj*="fieldsListItem"]'
    ) as HTMLElement;

    // Expand address field
    const addressExpandButton = within(addressListItem).getByTestId('toggleExpandButton');
    fireEvent.click(addressExpandButton);

    // Wait for street field to appear
    const streetField = await screen.findByText('street', {
      selector: '[data-test-subj*="fieldName"]',
    });
    const streetListItem = streetField.closest('[data-test-subj*="fieldsListItem"]') as HTMLElement;

    // Click edit button for street field
    const streetEditButton = within(streetListItem).getByTestId('editFieldButton');
    fireEvent.click(streetEditButton);

    // Wait for flyout to open
    const flyout = await screen.findByTestId('mappingsEditorFieldEdit');

    // It should have the correct title
    const flyoutTitle = within(flyout).getByTestId('flyoutTitle');
    expect(flyoutTitle.textContent).toEqual(`Edit field 'street'`);

    // It should have the correct field path
    const fieldPath = within(flyout).getByTestId('fieldPath');
    expect(fieldPath.textContent).toEqual('user > address > street');

    // The advanced settings should be hidden initially
    const advancedSettings = within(flyout).getByTestId('advancedSettings');
    expect(advancedSettings.style.display).toEqual('none');
  });

  test('should update form parameters when changing the field datatype', async () => {
    const defaultMappings = {
      properties: {
        userName: {
          ...defaultTextParameters,
        },
      },
    };

    setup({ value: defaultMappings, onChange: onChangeHandler, indexSettings: {} });

    await screen.findByTestId('mappingsEditor');

    // Wait for fields to render
    await screen.findByTestId('fieldsList');

    // Find the userName field by text
    const userNameFieldText = await screen.findByText('userName', {
      selector: '[data-test-subj*="fieldName"]',
    });
    const userNameListItem = userNameFieldText.closest(
      '[data-test-subj*="fieldsListItem"]'
    ) as HTMLElement;
    expect(userNameListItem).toBeInTheDocument();

    // Open the flyout to edit the field
    const editButton = within(userNameListItem).getByTestId('editFieldButton');
    fireEvent.click(editButton);

    const flyout = await screen.findByTestId('mappingsEditorFieldEdit');

    // Change field type to Range using EuiComboBox harness
    const fieldTypeComboBox = new EuiComboBoxTestHarness('fieldType');
    fieldTypeComboBox.selectOption('range');

    // Wait for SubTypeParameter to appear (range type has subTypes)
    await within(flyout).findByTestId('fieldSubType');

    // Save and close flyout
    const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
    await waitFor(() => {
      expect(updateButton).not.toBeDisabled();
    });
    fireEvent.click(updateButton);

    await waitFor(() => {
      const lastCall = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1][0];
      const data = lastCall.getData(lastCall.isValid ?? true);

      const updatedMappings = {
        ...defaultMappings,
        properties: {
          userName: {
            ...defaultDateRangeParameters,
          },
        },
      };

      // Serialized as subType 'date_range', not main type 'range'
      expect(data).toEqual(updatedMappings);
    });
  });

  test('should have Update button enabled only when changes are made', async () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'text',
        },
      },
    };

    setup({ value: defaultMappings, onChange: onChangeHandler, indexSettings: {} });

    await screen.findByTestId('mappingsEditor');

    // Wait for fields to render
    await screen.findByTestId('fieldsList');

    // Find the myField field by text
    const myFieldText = await screen.findByText('myField', {
      selector: '[data-test-subj*="fieldName"]',
    });
    const myFieldListItem = myFieldText.closest(
      '[data-test-subj*="fieldsListItem"]'
    ) as HTMLElement;

    // Open the flyout to edit the field
    const editButton = within(myFieldListItem).getByTestId('editFieldButton');
    fireEvent.click(editButton);

    const flyout = await screen.findByTestId('mappingsEditorFieldEdit');

    // Update button should be disabled initially (no changes)
    const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
    expect(updateButton).toBeDisabled();

    // Change the field name
    const nameInput = within(flyout).getByTestId('nameParameterInput');
    fireEvent.change(nameInput, { target: { value: 'updatedField' } });

    // Update button should now be enabled
    expect(updateButton).not.toBeDisabled();
  });
});
