/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditFieldAdapter } from './edit_field_adapter';
import type { EditFieldAdapterProps } from './edit_field_adapter';
import { renderWithTestingProviders } from '../../../common/mock';
import { InputText } from '../../templates_v2/field_types/controls/input_text';

describe('EditFieldAdapter', () => {
  const defaultProps: EditFieldAdapterProps<typeof InputText> = {
    value: 'initial value',
    onSubmit: jest.fn(),
    isLoading: false,
    'data-test-subj': 'test-field',
    FieldComponent: InputText,
    componentProps: {
      name: 'test',
      type: 'keyword',
      label: 'Test Field',
      control: 'INPUT_TEXT',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the field in view mode by default', () => {
    renderWithTestingProviders(<EditFieldAdapter {...defaultProps} />);

    expect(screen.getByText('Test Field')).toBeInTheDocument();
    expect(screen.getByTestId('test-field-value')).toHaveTextContent('initial value');
    expect(screen.getByTestId('test-field-edit-button')).toBeInTheDocument();
  });

  it('shows "Field not defined" when value is empty', () => {
    renderWithTestingProviders(<EditFieldAdapter {...defaultProps} value="" />);

    expect(screen.getByTestId('test-field-value')).toHaveTextContent('Field not defined');
  });

  it('falls back to field name when label is not provided', () => {
    renderWithTestingProviders(
      <EditFieldAdapter
        {...defaultProps}
        componentProps={{ ...defaultProps.componentProps, label: undefined }}
      />
    );

    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('switches to edit mode when edit button is clicked', async () => {
    renderWithTestingProviders(<EditFieldAdapter {...defaultProps} />);

    const editButton = screen.getByTestId('test-field-edit-button');
    await userEvent.click(editButton);

    expect(screen.getByTestId('input')).toBeInTheDocument();
    expect(screen.getByTestId('test-field-submit')).toBeInTheDocument();
    expect(screen.getByTestId('test-field-cancel')).toBeInTheDocument();
  });

  it('calls onSubmit with the updated value when save is clicked', async () => {
    const mockOnSubmit = jest.fn();
    renderWithTestingProviders(<EditFieldAdapter {...defaultProps} onSubmit={mockOnSubmit} />);

    // Enter edit mode
    const editButton = screen.getByTestId('test-field-edit-button');
    await userEvent.click(editButton);

    // Change the value
    const input = screen.getByTestId('input');
    await userEvent.clear(input);
    await userEvent.type(input, 'new value');

    // Submit
    const saveButton = screen.getByTestId('test-field-submit');
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('cancels edit mode without calling onSubmit when cancel is clicked', async () => {
    const mockOnSubmit = jest.fn();
    renderWithTestingProviders(<EditFieldAdapter {...defaultProps} onSubmit={mockOnSubmit} />);

    // Enter edit mode
    const editButton = screen.getByTestId('test-field-edit-button');
    await userEvent.click(editButton);

    // Change the value
    const input = screen.getByTestId('input');
    await userEvent.clear(input);
    await userEvent.type(input, 'new value');

    // Cancel
    const cancelButton = screen.getByTestId('test-field-cancel');
    await userEvent.click(cancelButton);

    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('test-field-value')).toHaveTextContent('initial value');
  });

  it('hides edit button when loading', () => {
    renderWithTestingProviders(<EditFieldAdapter {...defaultProps} isLoading />);

    // EditableFieldWrapper hides the edit button when isLoading is true
    expect(screen.queryByTestId('test-field-edit-button')).not.toBeInTheDocument();
  });

  it('handles array values for display', () => {
    renderWithTestingProviders(
      <EditFieldAdapter {...defaultProps} value={['option1', 'option2']} />
    );

    expect(screen.getByTestId('test-field-value')).toHaveTextContent('option1, option2');
  });

  it('shows "Field not defined" for empty array', () => {
    renderWithTestingProviders(<EditFieldAdapter {...defaultProps} value={[]} />);

    expect(screen.getByTestId('test-field-value')).toHaveTextContent('Field not defined');
  });
});
