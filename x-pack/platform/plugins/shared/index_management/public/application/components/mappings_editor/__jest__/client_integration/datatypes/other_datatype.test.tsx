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

jest.mock('../../../../component_templates/component_templates_context', () => ({
  useComponentTemplatesContext: jest.fn().mockReturnValue({
    toasts: {
      addError: jest.fn(),
      addSuccess: jest.fn(),
    },
  }),
}));

const onChangeHandler = jest.fn();
// FLAKY: https://github.com/elastic/kibana/issues/253594
describe.skip('Mappings editor: other datatype', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('allow to add custom field type', async () => {
    const Component = WithAppDependencies(MappingsEditor, {});
    render(
      <I18nProvider>
        <Component onChange={onChangeHandler} indexSettings={{}} />
      </I18nProvider>
    );

    await screen.findByTestId('mappingsEditor');

    // Click "Add field" button to show the create field form
    const addFieldButton = screen.getByTestId('addFieldButton');
    fireEvent.click(addFieldButton);

    const createForm = await screen.findByTestId('createFieldForm');

    // Set field name
    const nameInput = within(createForm).getByTestId('nameParameterInput');
    fireEvent.change(nameInput, { target: { value: 'myField' } });

    // Select "other" field type using EuiComboBox harness
    const fieldTypeComboBox = new EuiComboBoxTestHarness('fieldType');
    await fieldTypeComboBox.select('other');
    await fieldTypeComboBox.close();

    await waitFor(() => {
      expect(within(createForm).queryByTestId('fieldSubType')).toBeInTheDocument();
    });

    const customTypeInput = within(createForm).getByTestId('fieldSubType');
    fireEvent.change(customTypeInput, { target: { value: 'customType' } });

    // Click "Add" button to submit the field
    const addButton = within(createForm).getByTestId('addButton');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(onChangeHandler).toHaveBeenCalled();
    });

    const mappings = {
      properties: {
        myField: {
          type: 'customType',
        },
      },
    };

    const [callData] = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1];
    const actualMappings = callData.getData();
    expect(actualMappings).toEqual(mappings);
  });

  test('allow to change a field type to a custom type', async () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'text',
        },
      },
    };

    const updatedMappings = {
      properties: {
        myField: {
          type: 'customType',
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

    // Change the field type to "other" using EuiComboBox harness
    const fieldTypeComboBox = new EuiComboBoxTestHarness('fieldType');
    await fieldTypeComboBox.select('other');
    await fieldTypeComboBox.close();

    const customTypeInput = await within(flyout).findByTestId('fieldSubType');
    fireEvent.change(customTypeInput, { target: { value: 'customType' } });

    // Save the field and close the flyout
    const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(onChangeHandler).toHaveBeenCalled();
    });

    const [callData] = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1];
    const actualMappings = callData.getData();
    expect(actualMappings).toEqual(updatedMappings);
  });
});
