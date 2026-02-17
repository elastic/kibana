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

export const defaultVersionParameters = {
  type: 'version',
};

const onChangeHandler = jest.fn();
describe('Mappings editor: version datatype', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('supports meta parameter', async () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'version',
        },
      },
    };

    const updatedMappings = { ...defaultMappings };

    const metaParameter = {
      meta: {
        my_metadata: 'foobar',
      },
    };

    const Component = WithAppDependencies(MappingsEditor, {});
    render(
      <I18nProvider>
        <Component value={defaultMappings} onChange={onChangeHandler} indexSettings={{}} />
      </I18nProvider>
    );

    await screen.findByTestId('mappingsEditor');

    const editButton = screen.getByTestId('editFieldButton');
    fireEvent.click(editButton);

    const flyout = await screen.findByTestId('mappingsEditorFieldEdit');

    const advancedSettingsToggle = within(flyout).getByTestId('toggleAdvancedSetting');
    fireEvent.click(advancedSettingsToggle);

    await waitFor(() => {
      const advancedSettings = within(flyout).getByTestId('advancedSettings');
      expect(advancedSettings.style.display).not.toBe('none');
    });

    const metaParameterSection = within(flyout).getByTestId('metaParameter');
    const metaToggle = within(metaParameterSection).getByTestId('formRowToggle');
    fireEvent.click(metaToggle);

    await waitFor(() => {
      expect(metaToggle.getAttribute('aria-checked')).toBe('true');
    });

    const metaEditor = await within(flyout).findByTestId('metaParameterEditor');
    const metaValue = JSON.stringify(metaParameter.meta);

    Object.defineProperty(metaEditor, 'value', {
      writable: true,
      value: metaValue,
    });

    metaEditor.setAttribute('data-currentvalue', metaValue);

    fireEvent.change(metaEditor, { target: { value: metaValue } });

    await waitFor(() => {
      const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
      expect(updateButton).not.toBeDisabled();
    });

    const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(onChangeHandler).toHaveBeenCalled();
    });

    updatedMappings.properties.myField = {
      ...defaultVersionParameters,
      ...metaParameter,
    };

    const [callData] = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1];
    const actualMappings = callData.getData();
    expect(actualMappings).toEqual(updatedMappings);
  });
});
