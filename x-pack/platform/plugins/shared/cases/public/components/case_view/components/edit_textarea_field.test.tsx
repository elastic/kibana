/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import type { EditTextareaFieldProps } from './edit_textarea_field';
import { EditTextareaField } from './edit_textarea_field';
import { readCasesPermissions, renderWithTestingProviders } from '../../../common/mock';

const onSubmit = jest.fn();
const defaultProps: EditTextareaFieldProps = {
  title: 'Description',
  value: 'initial description',
  onSubmit,
  isLoading: false,
};

describe('EditTextareaField', () => {
  let user: UserEvent;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  });

  it('renders the title and current value', () => {
    renderWithTestingProviders(<EditTextareaField {...defaultProps} />);

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByTestId('edit-textarea-field-value')).toHaveTextContent(
      'initial description'
    );
  });

  it('renders "Field not defined" when value is empty', () => {
    renderWithTestingProviders(<EditTextareaField {...defaultProps} value="" />);

    expect(screen.getByTestId('edit-textarea-field-value')).toHaveTextContent('Field not defined');
  });

  it('shows the edit button when user has update permissions', () => {
    renderWithTestingProviders(<EditTextareaField {...defaultProps} />);

    expect(screen.getByTestId('edit-textarea-field-edit-button')).toBeInTheDocument();
  });

  it('hides the edit button when user lacks update permissions', () => {
    renderWithTestingProviders(<EditTextareaField {...defaultProps} />, {
      wrapperProps: { permissions: readCasesPermissions() },
    });

    expect(screen.queryByTestId('edit-textarea-field-edit-button')).not.toBeInTheDocument();
  });

  it('hides the edit button when loading', () => {
    renderWithTestingProviders(<EditTextareaField {...defaultProps} isLoading />);

    expect(screen.queryByTestId('edit-textarea-field-edit-button')).not.toBeInTheDocument();
  });

  it('shows the textarea input when the edit button is clicked', async () => {
    renderWithTestingProviders(<EditTextareaField {...defaultProps} />);

    await user.click(screen.getByTestId('edit-textarea-field-edit-button'));

    expect(screen.getByTestId('edit-textarea-field-input')).toBeInTheDocument();
    expect(screen.getByTestId('edit-textarea-field-submit')).toBeInTheDocument();
    expect(screen.getByTestId('edit-textarea-field-cancel')).toBeInTheDocument();
  });

  it('calls onSubmit with the trimmed updated value and closes the editor', async () => {
    renderWithTestingProviders(<EditTextareaField {...defaultProps} />);

    await user.click(screen.getByTestId('edit-textarea-field-edit-button'));
    const textarea = screen.getByTestId('edit-textarea-field-input');
    await user.clear(textarea);
    await user.type(textarea, '  updated description  ');
    await user.click(screen.getByTestId('edit-textarea-field-submit'));

    expect(onSubmit).toHaveBeenCalledWith('updated description');
    expect(screen.queryByTestId('edit-textarea-field-input')).not.toBeInTheDocument();
  });

  it('does not call onSubmit when cancel is clicked', async () => {
    renderWithTestingProviders(<EditTextareaField {...defaultProps} />);

    await user.click(screen.getByTestId('edit-textarea-field-edit-button'));
    const textarea = screen.getByTestId('edit-textarea-field-input');
    await user.clear(textarea);
    await user.type(textarea, 'changed');
    await user.click(screen.getByTestId('edit-textarea-field-cancel'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByTestId('edit-textarea-field-input')).not.toBeInTheDocument();
  });

  it('uses a custom data-test-subj', () => {
    renderWithTestingProviders(
      <EditTextareaField {...defaultProps} data-test-subj="my-textarea-field" />
    );

    expect(screen.getByTestId('my-textarea-field-value')).toBeInTheDocument();
  });
});
