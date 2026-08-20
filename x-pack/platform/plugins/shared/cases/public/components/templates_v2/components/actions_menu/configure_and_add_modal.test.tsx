/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../../../common/mock';
import type { FieldTypeAction, LibraryFieldAction } from './types';
import {
  ConfigureAndAddModal,
  slugifyFieldName,
  uniquifyFieldName,
} from './configure_and_add_modal';

jest.mock('../../../field_library/components/field_definition_preview', () => ({
  FieldDefinitionPreview: () => <div data-test-subj="fieldDefinitionPreview" />,
}));

const user = userEvent.setup({ pointerEventsCheck: 0 });

const textAction: FieldTypeAction = {
  kind: 'fieldType',
  id: 'fieldType:INPUT_TEXT',
  label: 'Text Input',
  control: 'INPUT_TEXT',
  scaffold: { name: 'field_name', label: 'Label', control: 'INPUT_TEXT', type: 'keyword' },
  testSubj: 'newField-INPUT_TEXT',
};

const libraryAction: LibraryFieldAction = {
  kind: 'libraryField',
  id: 'library:root_cause',
  label: 'root_cause',
  fieldName: 'root_cause',
  definition: 'name: root_cause\ncontrol: INPUT_TEXT\nlabel: Root cause\ntype: keyword\n',
  fieldDescription: 'Why it happened',
  testSubj: 'fieldLibrary-root_cause',
};

describe('slugifyFieldName / uniquifyFieldName', () => {
  it('slugifies labels into unique field keys', () => {
    expect(slugifyFieldName('Root Cause')).toBe('root_cause');
    expect(slugifyFieldName('  Priority!! ')).toBe('priority');
    expect(slugifyFieldName('')).toBe('field');
    expect(uniquifyFieldName('summary', new Set(['summary']))).toBe('summary_2');
    expect(uniquifyFieldName('summary', new Set(['summary', 'summary_2']))).toBe('summary_3');
  });
});

describe('ConfigureAndAddModal', () => {
  it('requires a label and emits definition plus optional rules without empty blocks', async () => {
    const onConfirm = jest.fn();
    renderWithTestingProviders(
      <ConfigureAndAddModal
        action={textAction}
        existingFieldNames={new Set(['summary'])}
        siblingFieldNames={['summary']}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
      />
    );

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
    expect(screen.getByLabelText('Remove condition')).toBeInTheDocument();
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

  it('keeps library definitions read-only and inserts $ref plus rules', async () => {
    const onConfirm = jest.fn();
    renderWithTestingProviders(
      <ConfigureAndAddModal
        action={libraryAction}
        existingFieldNames={new Set(['summary'])}
        siblingFieldNames={['summary']}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByTestId('configureAndAdd-libraryLabel')).toHaveAttribute('readonly');
    expect(screen.getByTestId('configureAndAdd-libraryKey')).toHaveValue('root_cause');
    expect(screen.getByText('Why it happened')).toBeInTheDocument();
    expect(screen.getByText('Root cause · Field library')).toBeInTheDocument();

    await user.click(screen.getByTestId('configureAndAdd-addRule'));
    await user.click(screen.getByTestId('configureAndAdd-confirm'));

    expect(onConfirm).toHaveBeenCalledWith({
      displayName: 'Root cause',
      fieldObject: {
        $ref: 'root_cause',
        validation: { required: true },
      },
    });
  });
});
