/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../../../common/mock';
import { MAX_SNAKE_KEY_LENGTH } from '../../../../../common/constants';
import { getAuthorableFieldNameViolation } from '../../../../../common/utils/template_fields';
import type { FieldTypeAction, LibraryFieldAction } from './types';
import {
  ConfigureAndAddModal,
  getAvailableFieldName,
  slugifyFieldName,
} from './configure_and_add_modal';

jest.mock('../../../field_library/components/field_definition_preview', () => ({
  FieldDefinitionPreview: ({
    requirementBadge,
    hiddenNote,
  }: {
    requirementBadge?: string;
    hiddenNote?: string;
  }) => (
    <div data-test-subj="fieldDefinitionPreview">
      <span data-test-subj="previewBadge">{requirementBadge}</span>
      <span data-test-subj="previewHiddenNote">{hiddenNote}</span>
    </div>
  ),
}));

const user = userEvent.setup({ pointerEventsCheck: 0 });

const fieldTypeAction = (control: string): FieldTypeAction => ({
  kind: 'fieldType',
  id: `fieldType:${control}`,
  label: control,
  control,
  scaffold: { name: 'field_name', label: 'Label', control, type: 'keyword' },
  testSubj: `newField-${control}`,
});

const textAction = fieldTypeAction('INPUT_TEXT');

const libraryAction: LibraryFieldAction = {
  kind: 'libraryField',
  id: 'library:root_cause',
  label: 'root_cause',
  fieldName: 'root_cause',
  definition: 'name: root_cause\ncontrol: INPUT_TEXT\nlabel: Root cause\ntype: keyword\n',
  fieldDescription: 'Why it happened',
  testSubj: 'fieldLibrary-root_cause',
};

const renderModal = ({
  action = textAction,
  existing = ['summary'],
  siblings = existing,
}: {
  action?: FieldTypeAction | LibraryFieldAction;
  existing?: string[];
  siblings?: string[];
} = {}) => {
  const onConfirm = jest.fn();
  renderWithTestingProviders(
    <ConfigureAndAddModal
      action={action}
      existingFieldNames={new Set(existing)}
      siblingFieldNames={siblings}
      onCancel={jest.fn()}
      onConfirm={onConfirm}
    />
  );
  return { onConfirm };
};

const editKey = async (value: string) => {
  await user.click(screen.getByTestId('configureAndAdd-editKey'));
  const nameInput = screen.getByTestId('configureAndAdd-name');
  await user.clear(nameInput);
  await user.click(nameInput);
  await user.paste(value);
};

const getRequirementSelects = () =>
  screen
    .getAllByLabelText('Validation')
    .filter((element): element is HTMLSelectElement => element instanceof HTMLSelectElement);

describe('slugifyFieldName / getAvailableFieldName', () => {
  it('slugifies labels into authorable field keys', () => {
    expect(slugifyFieldName('Root Cause', 'keyword')).toBe('root_cause');
    expect(slugifyFieldName('  Priority!! ', 'keyword')).toBe('priority');
    expect(slugifyFieldName('my-field (v2)', 'keyword')).toBe('my_field_v2');
    expect(slugifyFieldName('', 'keyword')).toBe('field');
    expect(slugifyFieldName('日本語', 'keyword')).toBe('field');
  });

  it('truncates long labels so the storage key stays within the limit even after a suffix', () => {
    const slug = slugifyFieldName('a'.repeat(400), 'unsigned_long');
    expect(getAuthorableFieldNameViolation(`${slug}_99`, 'unsigned_long')).toBeNull();
    expect(`${slug}_as_unsigned_long`.length).toBeLessThanOrEqual(MAX_SNAKE_KEY_LENGTH);
  });

  it('skips exact and camelCase-folded collisions', () => {
    expect(getAvailableFieldName('summary', new Set(['summary']))).toBe('summary_2');
    expect(getAvailableFieldName('summary', new Set(['summary', 'summary_2']))).toBe('summary_3');
    expect(getAvailableFieldName('my_field', new Set(['myField']))).toBe('my_field_2');
  });
});

describe('ConfigureAndAddModal', () => {
  it('requires a label and emits definition plus optional rules without empty blocks', async () => {
    const { onConfirm } = renderModal();

    const labelInput = screen.getByTestId('configureAndAdd-label');
    expect(labelInput).toHaveValue('');
    expect(labelInput).toHaveAttribute('placeholder', 'e.g. Customer impact');
    expect(screen.getByText('Key: —')).toBeInTheDocument();
    expect(screen.getByTestId('configureAndAdd-confirm')).toBeDisabled();

    await user.type(labelInput, 'Summary');
    expect(screen.getByText(/Key: summary_2/)).toBeInTheDocument();
    expect(screen.getByTestId('fieldDefinitionPreview')).toBeInTheDocument();

    await user.click(screen.getByTestId('configureAndAdd-addCondition'));
    expect(screen.getByPlaceholderText('Value')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Remove condition'));

    await user.click(screen.getByTestId('configureAndAdd-confirm'));
    expect(onConfirm).toHaveBeenCalledWith({
      displayName: 'Summary',
      fieldObject: expect.objectContaining({
        name: 'summary_2',
        label: 'Summary',
        control: 'INPUT_TEXT',
        type: 'keyword',
      }),
    });
    expect(onConfirm.mock.calls[0][0].fieldObject.display).toBeUndefined();
    expect(onConfirm.mock.calls[0][0].fieldObject.validation).toBeUndefined();
  });

  it('shows the field type title as is in the subtitle', () => {
    renderModal();
    expect(screen.getByTestId('configureAndAddModal')).toHaveTextContent('Text Input');
  });

  it('keeps library definitions read-only and inserts $ref plus rules', async () => {
    const { onConfirm } = renderModal({ action: libraryAction });

    expect(screen.getByTestId('configureAndAdd-libraryLabel')).toHaveAttribute('readonly');
    expect(screen.getByTestId('configureAndAdd-libraryKey')).toHaveValue('root_cause');
    expect(screen.getByText('Why it happened')).toBeInTheDocument();
    expect(screen.getByText('Root cause · Field library')).toBeInTheDocument();

    await user.click(screen.getByTestId('configureAndAdd-addRule'));
    expect(screen.getByTestId('previewBadge')).toHaveTextContent('Required');
    await user.click(screen.getByTestId('configureAndAdd-confirm'));

    expect(onConfirm).toHaveBeenCalledWith({
      displayName: 'Root cause',
      fieldObject: {
        $ref: 'root_cause',
        validation: { required: true },
      },
    });
  });

  describe('key validation', () => {
    it('blocks a manually edited key with characters outside the authoring charset', async () => {
      const { onConfirm } = renderModal();
      await user.type(screen.getByTestId('configureAndAdd-label'), 'Impact');
      await editKey('my field');

      expect(
        screen.getByText(
          'The field name "my field" can only contain letters (A-Z, a-z), digits, and underscores.'
        )
      ).toBeInTheDocument();
      expect(screen.getByTestId('configureAndAdd-confirm')).toBeDisabled();
      await user.click(screen.getByTestId('configureAndAdd-confirm'));
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('blocks a key that camelCase-folds onto an existing field', async () => {
      renderModal({ existing: ['myField'] });
      await user.type(screen.getByTestId('configureAndAdd-label'), 'Other');
      await editKey('my_field');

      expect(
        screen.getByText(/The field name "my_field" conflicts with the existing field "myField"/)
      ).toBeInTheDocument();
      expect(screen.getByTestId('configureAndAdd-confirm')).toBeDisabled();
    });

    it('auto-generates a key that avoids folded twins', async () => {
      renderModal({ existing: ['myField'] });
      await user.type(screen.getByTestId('configureAndAdd-label'), 'My Field');

      expect(screen.getByText(/Key: my_field_2/)).toBeInTheDocument();
      expect(screen.getByTestId('configureAndAdd-confirm')).not.toBeDisabled();
    });

    it('blocks a key whose storage key would exceed the length limit', async () => {
      renderModal();
      await user.type(screen.getByTestId('configureAndAdd-label'), 'Impact');
      const longName = 'a'.repeat(MAX_SNAKE_KEY_LENGTH);
      await editKey(longName);

      expect(screen.getByText(new RegExp(`"${longName}" is too long`))).toBeInTheDocument();
      expect(screen.getByTestId('configureAndAdd-confirm')).toBeDisabled();
    });

    it('blocks a key that already exists in the template', async () => {
      renderModal();
      await user.type(screen.getByTestId('configureAndAdd-label'), 'Impact');
      await editKey('summary');

      expect(
        screen.getByText('A field named "summary" already exists in this template.')
      ).toBeInTheDocument();
      expect(screen.getByTestId('configureAndAdd-confirm')).toBeDisabled();
    });
  });

  describe('conditions', () => {
    it('combines two show_when rows into a compound condition', async () => {
      const { onConfirm } = renderModal({ existing: ['summary', 'severity_level'] });
      await user.type(screen.getByTestId('configureAndAdd-label'), 'Impact');

      await user.click(screen.getByTestId('configureAndAdd-addCondition'));
      await user.click(screen.getByTestId('configureAndAdd-addCondition'));
      const fieldSelects = screen.getAllByLabelText('Field');
      await user.selectOptions(fieldSelects[1], 'severity_level');
      const valueInputs = screen.getAllByLabelText('Value');
      await user.type(valueInputs[0], 'high');
      await user.selectOptions(screen.getAllByLabelText('Operator')[1], 'not_empty');

      expect(screen.getByTestId('previewHiddenNote')).toHaveTextContent(
        'Hidden until summary equals high and 1 other condition'
      );

      await user.click(screen.getByTestId('configureAndAdd-confirm'));
      expect(onConfirm.mock.calls[0][0].fieldObject.display).toEqual({
        show_when: {
          combine: 'all',
          rules: [
            { field: 'summary', operator: 'eq', value: 'high' },
            { field: 'severity_level', operator: 'not_empty' },
          ],
        },
      });
    });

    it('keeps a single show_when row as a plain condition', async () => {
      const { onConfirm } = renderModal();
      await user.type(screen.getByTestId('configureAndAdd-label'), 'Impact');
      await user.click(screen.getByTestId('configureAndAdd-addCondition'));
      await user.type(screen.getByLabelText('Value'), 'high');

      await user.click(screen.getByTestId('configureAndAdd-confirm'));
      expect(onConfirm.mock.calls[0][0].fieldObject.display).toEqual({
        show_when: { field: 'summary', operator: 'eq', value: 'high' },
      });
    });

    it('combines two required_when rows and describes them in the badge', async () => {
      const { onConfirm } = renderModal({ existing: ['summary', 'severity_level'] });
      await user.type(screen.getByTestId('configureAndAdd-label'), 'Impact');

      await user.click(screen.getByTestId('configureAndAdd-addRule'));
      await user.selectOptions(getRequirementSelects()[0], 'required_when');
      await user.click(screen.getByTestId('configureAndAdd-addRule'));
      expect(getRequirementSelects()[1]).toHaveValue('required_when');
      await user.selectOptions(screen.getAllByLabelText('Field')[1], 'severity_level');
      await user.type(screen.getAllByLabelText('Value')[0], 'high');
      await user.type(screen.getAllByLabelText('Value')[1], 'critical');

      expect(screen.getByTestId('previewBadge')).toHaveTextContent(
        'Required when summary equals high and 1 other condition'
      );

      await user.click(screen.getByTestId('configureAndAdd-confirm'));
      expect(onConfirm.mock.calls[0][0].fieldObject.validation).toEqual({
        required_when: {
          combine: 'all',
          rules: [
            { field: 'summary', operator: 'eq', value: 'high' },
            { field: 'severity_level', operator: 'eq', value: 'critical' },
          ],
        },
      });
    });

    it('disables Required when and conditions when the template has no other fields', async () => {
      const { onConfirm } = renderModal({ existing: [] });
      await user.type(screen.getByTestId('configureAndAdd-label'), 'Impact');

      expect(screen.getByTestId('configureAndAdd-addCondition')).toBeDisabled();
      await user.click(screen.getByTestId('configureAndAdd-addRule'));
      const requiredWhen = within(getRequirementSelects()[0]).getByRole('option', {
        name: 'Required when…',
      });
      expect(requiredWhen).toBeDisabled();
      expect(
        screen.getByText(
          'Add another field to the template to make this field conditionally required.'
        )
      ).toBeInTheDocument();
      expect(screen.getByTestId('configureAndAdd-addRule')).toBeDisabled();

      await user.click(screen.getByTestId('configureAndAdd-confirm'));
      expect(onConfirm.mock.calls[0][0].fieldObject.validation).toEqual({ required: true });
      expect(onConfirm.mock.calls[0][0].fieldObject.display).toBeUndefined();
    });
  });

  describe('requirements are mutually exclusive', () => {
    it('allows only one plain requirement, and picking one replaces Required when rows', async () => {
      const { onConfirm } = renderModal({ existing: ['summary', 'severity_level'] });
      await user.type(screen.getByTestId('configureAndAdd-label'), 'Impact');

      await user.click(screen.getByTestId('configureAndAdd-addRule'));
      expect(getRequirementSelects()[0]).toHaveValue('required');
      expect(screen.getByTestId('configureAndAdd-addRule')).toBeDisabled();

      await user.selectOptions(getRequirementSelects()[0], 'required_when');
      await user.click(screen.getByTestId('configureAndAdd-addRule'));
      expect(getRequirementSelects()).toHaveLength(2);

      await user.selectOptions(getRequirementSelects()[1], 'required_on_close');
      expect(getRequirementSelects()).toHaveLength(1);
      expect(getRequirementSelects()[0]).toHaveValue('required_on_close');
      expect(screen.getByTestId('previewBadge')).toHaveTextContent('Required on close');

      await user.click(screen.getByTestId('configureAndAdd-confirm'));
      expect(onConfirm.mock.calls[0][0].fieldObject.validation).toEqual({
        required_on_close: true,
      });
    });
  });

  describe('options metadata', () => {
    it('requires at least one option for a select and keeps the key present', async () => {
      const { onConfirm } = renderModal({ action: fieldTypeAction('SELECT_BASIC') });
      await user.type(screen.getByTestId('configureAndAdd-label'), 'Tier');
      await user.clear(screen.getByTestId('configureAndAdd-options'));

      expect(screen.getByText('Options must have at least 1 item.')).toBeInTheDocument();
      expect(screen.getByTestId('configureAndAdd-confirm')).toBeDisabled();

      await user.type(screen.getByTestId('configureAndAdd-options'), 'gold, silver, gold');
      await user.click(screen.getByTestId('configureAndAdd-confirm'));
      expect(onConfirm.mock.calls[0][0].fieldObject.metadata).toEqual(
        expect.objectContaining({ options: ['gold', 'silver'] })
      );
    });

    it('requires at least two options for a radio group', async () => {
      renderModal({ action: fieldTypeAction('RADIO_GROUP') });
      await user.type(screen.getByTestId('configureAndAdd-label'), 'Tier');
      await user.clear(screen.getByTestId('configureAndAdd-options'));
      await user.type(screen.getByTestId('configureAndAdd-options'), 'gold, gold');

      expect(screen.getByText('Options must have at least 2 items.')).toBeInTheDocument();
      expect(screen.getByTestId('configureAndAdd-confirm')).toBeDisabled();
    });
  });
});
