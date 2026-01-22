/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { WithAppDependencies } from '../helpers/setup_environment';
import { MappingsEditor } from '../../../mappings_editor';
import { defaultShapeParameters } from './fixtures';

const onChangeHandler = jest.fn();
describe('Mappings editor: shape datatype', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initial view and default parameters values', async () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'shape',
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

    await screen.findByTestId('mappingsEditorFieldEdit');

    // Update the name of the field
    const nameInput = screen.getByTestId('nameParameterInput');
    fireEvent.change(nameInput, { target: { value: 'updatedField' } });

    // Save the field and close the flyout
    const updateButton = screen.getByTestId('editFieldUpdateButton');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(onChangeHandler).toHaveBeenCalled();
    });

    // It should have the default parameters values added for fields which are not set
    const updatedMappings = {
      properties: {
        updatedField: {
          ...defaultShapeParameters,
        },
      },
    };

    // Get the mappings data from the onChange callback
    const [callData] = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1];
    const actualMappings = callData.getData();
    expect(actualMappings).toEqual(updatedMappings);
  });
});
