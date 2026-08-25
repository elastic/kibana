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
import { MappingsEditor } from '../../mappings_editor';
import { WithAppDependencies } from './helpers/setup_environment';

jest.mock('@kbn/code-editor');

jest.mock('../../../component_templates/component_templates_context', () => ({
  useComponentTemplatesContext: jest.fn().mockReturnValue({
    toasts: {
      addError: jest.fn(),
      addSuccess: jest.fn(),
    },
  }),
}));

const onChangeHandler = jest.fn();
describe('Mappings editor: runtime fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  type MappingsEditorProps = ComponentProps<typeof MappingsEditor>;

  const setup = (props: Partial<MappingsEditorProps>) => {
    const Component = WithAppDependencies(MappingsEditor, {});
    return render(
      <I18nProvider>
        <Component {...props} />
      </I18nProvider>
    );
  };

  // Helper to switch tabs
  const selectTab = async (tabName: 'fields' | 'runtimeFields' | 'templates' | 'advanced') => {
    const tabTestIdMap: Record<typeof tabName, string> = {
      fields: 'fieldsTab',
      runtimeFields: 'runtimeTab',
      templates: 'templatesTab',
      advanced: 'advancedOptionsTab',
    };
    fireEvent.click(screen.getByTestId(tabTestIdMap[tabName]));
    await waitFor(() => {
      expect(screen.getByTestId(tabTestIdMap[tabName])).toHaveAttribute('aria-selected', 'true');
    });
  };

  describe('<RuntimeFieldsList />', () => {
    describe('when there are no runtime fields', () => {
      const defaultMappings = {};

      beforeEach(async () => {
        setup({
          value: defaultMappings,
          onChange: onChangeHandler,
          indexSettings: {},
        });

        await screen.findByTestId('mappingsEditor');
        await selectTab('runtimeFields');
      });

      test('should display an empty prompt', async () => {
        const emptyList = await screen.findByTestId('emptyList');
        expect(emptyList).toBeInTheDocument();
        expect(emptyList.textContent).toContain('Start by creating a runtime field');
      });

      test('should have a button to create a field and a link that points to the docs', async () => {
        const emptyList = await screen.findByTestId('emptyList');

        expect(within(emptyList).getByTestId('learnMoreLink')).toBeInTheDocument();
        expect(within(emptyList).getByTestId('createRuntimeFieldButton')).toBeInTheDocument();

        const createButton = screen.getByTestId('createRuntimeFieldButton');
        expect(createButton.textContent).toBe('Create runtime field');

        expect(screen.queryByTestId('runtimeFieldEditor')).not.toBeInTheDocument();

        fireEvent.click(createButton);

        const editor = await screen.findByTestId('runtimeFieldEditor');
        expect(editor).toBeInTheDocument();
      });
    });

    describe('when there are runtime fields', () => {
      const defaultMappings = {
        runtime: {
          day_of_week: {
            type: 'date',
            script: {
              source: 'emit("hello Kibana")',
            },
          },
        },
      };

      beforeEach(async () => {
        setup({
          value: defaultMappings,
          onChange: onChangeHandler,
          indexSettings: {},
        });

        await screen.findByTestId('mappingsEditor');
        await selectTab('runtimeFields');
      });

      test('should list the fields', async () => {
        const runtimeFieldsList = await screen.findByTestId(/runtimeFieldsListItem/);
        expect(runtimeFieldsList).toBeInTheDocument();

        const fieldName = within(runtimeFieldsList).getByTestId('fieldName');
        expect(fieldName.textContent).toBe('day_of_week');

        const fieldType = within(runtimeFieldsList).getByTestId('fieldType');
        expect(fieldType.textContent).toBe('Date');

        const editButton = within(runtimeFieldsList).getByTestId('editFieldButton');
        fireEvent.click(editButton);

        const editor = await screen.findByTestId('runtimeFieldEditor');
        expect(editor).toBeInTheDocument();

        const nameFieldRow = await within(editor).findByTestId('nameField');
        const nameInput = within(nameFieldRow).getByRole('textbox');
        expect(nameInput).toHaveValue('day_of_week');

        const scriptField = within(editor).queryByTestId('mockCodeEditor');
        if (scriptField) {
          expect(scriptField.getAttribute('data-currentvalue')).toBe('emit("hello Kibana")');
        }
      });

      test('should have a button to create fields', async () => {
        expect(screen.getByTestId('createRuntimeFieldButton')).toBeInTheDocument();

        expect(screen.queryByTestId('runtimeFieldEditor')).not.toBeInTheDocument();

        const createButton = screen.getByTestId('createRuntimeFieldButton');
        fireEvent.click(createButton);

        const editor = await screen.findByTestId('runtimeFieldEditor');
        expect(editor).toBeInTheDocument();
      });

      test('should close the runtime editor when switching tab', async () => {
        expect(screen.queryByTestId('runtimeFieldEditor')).not.toBeInTheDocument();

        const createButton = screen.getByTestId('createRuntimeFieldButton');
        fireEvent.click(createButton);

        const editor = await screen.findByTestId('runtimeFieldEditor');
        expect(editor).toBeInTheDocument();

        await selectTab('templates');

        expect(screen.queryByTestId('runtimeFieldEditor')).not.toBeInTheDocument();

        await selectTab('runtimeFields');

        expect(screen.queryByTestId('runtimeFieldEditor')).not.toBeInTheDocument();
      });
    });

    describe('Create / edit / delete runtime fields', () => {
      const defaultMappings = {};

      beforeEach(async () => {
        setup({
          value: defaultMappings,
          onChange: onChangeHandler,
          indexSettings: {},
        });

        await screen.findByTestId('mappingsEditor');
        await selectTab('runtimeFields');
      });

      test('should add the runtime field to the list and remove the empty prompt', async () => {
        expect(screen.getByTestId('emptyList')).toBeInTheDocument();

        const createButton = screen.getByTestId('createRuntimeFieldButton');
        fireEvent.click(createButton);

        const editor = await screen.findByTestId('runtimeFieldEditor');
        const nameFieldRow = await within(editor).findByTestId('nameField');
        const nameInput = within(nameFieldRow).getByRole('textbox');
        fireEvent.change(nameInput, { target: { value: 'myField' } });

        const typeFieldContainer = within(editor).getByTestId('typeField');
        const typeInput = within(typeFieldContainer).getByRole('combobox');
        fireEvent.change(typeInput, {
          target: { value: JSON.stringify([{ label: 'Boolean', value: 'boolean' }]) },
        });

        const saveButton = within(editor).getByTestId('saveFieldButton');
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(screen.queryByTestId('runtimeFieldEditor')).not.toBeInTheDocument();
        });

        expect(screen.queryByTestId('emptyList')).not.toBeInTheDocument();

        const runtimeFieldsList = await screen.findByTestId(/runtimeFieldsListItem/);
        const fieldName = within(runtimeFieldsList).getByTestId('fieldName');
        expect(fieldName.textContent).toBe('myField');

        expect(onChangeHandler).toHaveBeenCalled();
        const lastCall = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1][0];
        const data = lastCall.getData(lastCall.isValid ?? true);

        expect(data.runtime).toBeDefined();
        expect(data.runtime.myField).toBeDefined();
        expect(data.runtime.myField.type).toBeDefined();
      });

      test('should remove the runtime field from the list', async () => {
        const createButton = screen.getByTestId('createRuntimeFieldButton');
        fireEvent.click(createButton);

        const editor = await screen.findByTestId('runtimeFieldEditor');
        const nameFieldRow = await within(editor).findByTestId('nameField');
        const nameInput = within(nameFieldRow).getByRole('textbox');
        fireEvent.change(nameInput, { target: { value: 'myField' } });

        const typeFieldContainer = within(editor).getByTestId('typeField');
        const typeInput = within(typeFieldContainer).getByRole('combobox');
        fireEvent.change(typeInput, {
          target: { value: JSON.stringify([{ label: 'Boolean', value: 'boolean' }]) },
        });

        const saveButton = within(editor).getByTestId('saveFieldButton');
        fireEvent.click(saveButton);

        const runtimeFieldsList = await screen.findByTestId(/runtimeFieldsListItem/);
        expect(runtimeFieldsList).toBeInTheDocument();

        const removeButton = within(runtimeFieldsList).getByTestId('removeFieldButton');
        fireEvent.click(removeButton);

        const modal = await screen.findByTestId('runtimeFieldDeleteConfirmModal');
        const confirmButton = within(modal).getByTestId('confirmModalConfirmButton');
        fireEvent.click(confirmButton);

        await waitFor(() => {
          expect(screen.queryByTestId('runtimeFieldDeleteConfirmModal')).not.toBeInTheDocument();
          expect(screen.queryByTestId(/runtimeFieldsListItem/)).not.toBeInTheDocument();
        });

        expect(screen.getByTestId('emptyList')).toBeInTheDocument();

        expect(onChangeHandler).toHaveBeenCalled();
        const lastCall = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1][0];
        const data = lastCall.getData(lastCall.isValid ?? true);
        if (data) {
          expect(data.runtime).toBeUndefined();
        }
      });

      test('should edit the runtime field', async () => {
        const createButton = screen.getByTestId('createRuntimeFieldButton');
        fireEvent.click(createButton);

        const editor = await screen.findByTestId('runtimeFieldEditor');
        const nameFieldRow = await within(editor).findByTestId('nameField');
        const nameInput = within(nameFieldRow).getByRole('textbox');
        fireEvent.change(nameInput, { target: { value: 'originalField' } });

        const typeFieldContainer = within(editor).getByTestId('typeField');
        const typeInput = within(typeFieldContainer).getByRole('combobox');
        fireEvent.change(typeInput, {
          target: { value: JSON.stringify([{ label: 'Boolean', value: 'boolean' }]) },
        });

        const saveButton = within(editor).getByTestId('saveFieldButton');
        fireEvent.click(saveButton);

        let runtimeFieldsList = await screen.findByTestId(/runtimeFieldsListItem/);
        expect(within(runtimeFieldsList).getByTestId('fieldName').textContent).toBe(
          'originalField'
        );

        const editButton = within(runtimeFieldsList).getByTestId('editFieldButton');
        fireEvent.click(editButton);

        const editorEdit = await screen.findByTestId('runtimeFieldEditor');
        const nameFieldRowEdit = await within(editorEdit).findByTestId('nameField');
        const nameInputEdit = within(nameFieldRowEdit).getByRole('textbox');
        expect(nameInputEdit).toHaveValue('originalField');
        fireEvent.change(nameInputEdit, { target: { value: 'editedField' } });

        const saveButtonEdit = within(editorEdit).getByTestId('saveFieldButton');
        fireEvent.click(saveButtonEdit);

        await waitFor(() => {
          expect(screen.queryByTestId('runtimeFieldEditor')).not.toBeInTheDocument();
        });

        runtimeFieldsList = await screen.findByTestId(/runtimeFieldsListItem/);
        expect(within(runtimeFieldsList).getByTestId('fieldName').textContent).toBe('editedField');
        expect(within(runtimeFieldsList).getByTestId('fieldType').textContent).toBeDefined();

        expect(onChangeHandler).toHaveBeenCalled();
        const lastCall = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1][0];
        const data = lastCall.getData(lastCall.isValid ?? true);
        expect(data.runtime).toBeDefined();
        expect(data.runtime.editedField).toBeDefined();
        expect(data.runtime.editedField.type).toBeDefined();
        // Original field should be gone (name was changed)
        expect(data.runtime.originalField).toBeUndefined();
      });
    });
  });
});
