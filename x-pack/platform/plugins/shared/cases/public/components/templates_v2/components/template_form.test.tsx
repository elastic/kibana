/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TemplateYamlEditor } from './template_form';
import { TestProviders } from '../../../common/mock';

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ value, onChange }: { value: string; onChange: (code: string) => void }) => (
    <textarea
      data-test-subj="code-editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

jest.mock('../hooks/use_field_name_validation', () => ({
  useFieldNameValidation: jest.fn(),
}));

jest.mock('../hooks/use_user_picker_validation', () => ({
  useUserPickerValidation: jest.fn(),
}));

describe('TemplateFormFields', () => {
  const mockOnChange = jest.fn();
  const mockUseFieldNameValidation = jest.requireMock(
    '../hooks/use_field_name_validation'
  ).useFieldNameValidation;
  const mockUseUserPickerValidation = jest.requireMock(
    '../hooks/use_user_picker_validation'
  ).useUserPickerValidation;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderFields = (definition: string, onChange = mockOnChange) => {
    return render(
      <TestProviders>
        <TemplateYamlEditor value={definition} onChange={onChange} />
      </TestProviders>
    );
  };

  it('renders the YAML code editor with the provided definition', () => {
    renderFields('fields:\n  - name: test_field\n    type: keyword');

    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
    expect(screen.getByTestId('code-editor')).toHaveValue(
      'fields:\n  - name: test_field\n    type: keyword'
    );
  });

  it('calls onChange when the editor content changes', async () => {
    renderFields('initial: value');

    fireEvent.change(screen.getByTestId('code-editor'), {
      target: { value: 'updated: value' },
    });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('updated: value');
    });
  });

  it('shows saved check icon when isSaved is true', () => {
    render(
      <TestProviders>
        <TemplateYamlEditor value="test: value" onChange={mockOnChange} isSaved={true} />
      </TestProviders>
    );

    expect(screen.getByTitle('Template saved')).toBeInTheDocument();
  });

  it('calls useFieldNameValidation hook with editor and value', () => {
    const yamlValue = 'fields:\n  - name: field1\n    type: keyword';
    renderFields(yamlValue);

    expect(mockUseFieldNameValidation).toHaveBeenCalledWith(null, yamlValue);
  });

  it('calls useFieldNameValidation hook when value changes', async () => {
    const { rerender } = render(
      <TestProviders>
        <TemplateYamlEditor value="initial: value" onChange={mockOnChange} />
      </TestProviders>
    );

    expect(mockUseFieldNameValidation).toHaveBeenCalledWith(null, 'initial: value');

    rerender(
      <TestProviders>
        <TemplateYamlEditor value="updated: value" onChange={mockOnChange} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(mockUseFieldNameValidation).toHaveBeenCalledWith(null, 'updated: value');
    });
  });

  it('calls useUserPickerValidation hook with editor, value and security', () => {
    const yamlValue = 'fields:\n  - name: assignee\n    control: USER_PICKER\n    type: keyword';
    renderFields(yamlValue);

    expect(mockUseUserPickerValidation).toHaveBeenCalledWith(null, yamlValue, expect.anything());
  });

  it('calls useUserPickerValidation hook when value changes', async () => {
    const { rerender } = render(
      <TestProviders>
        <TemplateYamlEditor value="initial: value" onChange={mockOnChange} />
      </TestProviders>
    );

    expect(mockUseUserPickerValidation).toHaveBeenCalledWith(
      null,
      'initial: value',
      expect.anything()
    );

    rerender(
      <TestProviders>
        <TemplateYamlEditor value="updated: value" onChange={mockOnChange} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(mockUseUserPickerValidation).toHaveBeenCalledWith(
        null,
        'updated: value',
        expect.anything()
      );
    });
  });
});
