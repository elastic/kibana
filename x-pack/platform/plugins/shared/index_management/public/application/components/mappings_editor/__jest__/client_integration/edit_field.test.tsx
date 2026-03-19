/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiComboBoxTestHarness } from '@kbn/test-eui-helpers';

import { MappingsEditor } from '../../mappings_editor';
import { WithAppDependencies } from './helpers/setup_environment';
import { defaultTextParameters } from './datatypes/fixtures';
import { defaultDateRangeParameters } from './datatypes/fixtures';

const onChangeHandler = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// FLAKY: https://github.com/elastic/kibana/issues/253534
describe.skip('Mappings editor: edit field', () => {
  const getDocumentFields = () => screen.getByTestId('documentFields');
  const getFieldsListItems = () =>
    within(getDocumentFields()).getAllByTestId((content) => content.startsWith('fieldsListItem '));

  const getFieldListItemByName = (name: string) => {
    const items = getFieldsListItems();
    const item = items.find((it) => {
      const fieldNameEls = within(it).queryAllByTestId(/fieldName/);
      return fieldNameEls.some((el) => {
        if ((el.textContent || '').trim() !== name) return false;

        // Ensure this fieldName belongs to THIS list item, not a nested child item.
        let node: HTMLElement | null = el as HTMLElement;
        while (node && node !== it) {
          const subj = node.getAttribute('data-test-subj');
          if (typeof subj === 'string' && subj.startsWith('fieldsListItem ')) return false;
          node = node.parentElement;
        }

        return true;
      });
    });

    if (!item) {
      throw new Error(`Expected field list item "${name}" to exist`);
    }

    return item;
  };

  type MappingsEditorProps = ComponentProps<typeof MappingsEditor>;

  const setup = (props: Partial<MappingsEditorProps>) => {
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

    await screen.findByTestId('fieldsList');

    // Find all field list items
    const allFields = screen.getAllByTestId(/fieldsListItem/);

    // The user field should be the first root-level field
    const userField = allFields.find((el) => el.textContent?.includes('user'));
    expect(userField).toBeDefined();

    // Expand user field
    const userExpandButton = within(userField!).getByTestId('toggleExpandButton');
    fireEvent.click(userExpandButton);

    const addressListItem = getFieldListItemByName('address');

    // Expand address field
    const addressExpandButton = within(addressListItem).getByRole('button', {
      name: /field address/i,
    });
    fireEvent.click(addressExpandButton);

    const streetListItem = getFieldListItemByName('street');

    // Click edit button for street field
    const streetEditButton = within(streetListItem).getByTestId('editFieldButton');
    fireEvent.click(streetEditButton);

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

    await screen.findByTestId('fieldsList');

    // Find the userName field by text
    const userNameListItem = getFieldListItemByName('userName');
    expect(userNameListItem).toBeInTheDocument();

    // Open the flyout to edit the field
    const editButton = within(userNameListItem).getByTestId('editFieldButton');
    fireEvent.click(editButton);

    const flyout = await screen.findByTestId('mappingsEditorFieldEdit');

    // Change field type to Range using EuiComboBox harness
    const fieldTypeComboBox = new EuiComboBoxTestHarness('fieldType');
    await fieldTypeComboBox.select('range');
    await fieldTypeComboBox.close();

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

    await screen.findByTestId('fieldsList');

    // Find the myField field by text
    const myFieldListItem = getFieldListItemByName('myField');

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
