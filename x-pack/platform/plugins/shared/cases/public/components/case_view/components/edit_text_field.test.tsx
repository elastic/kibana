/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import type { EditTextFieldProps } from './edit_text_field';
import { EditTextField } from './edit_text_field';
import { readCasesPermissions, renderWithTestingProviders } from '../../../common/mock';

const onSubmit = jest.fn();
const defaultProps: EditTextFieldProps = {
  title: 'Summary',
  value: 'initial value',
  onSubmit,
  isLoading: false,
};

describe('EditTextField', () => {
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
    renderWithTestingProviders(<EditTextField {...defaultProps} />);

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByTestId('edit-text-field-value')).toHaveTextContent('initial value');
  });

  it('renders "Field not defined" when value is empty', () => {
    renderWithTestingProviders(<EditTextField {...defaultProps} value="" />);

    expect(screen.getByTestId('edit-text-field-value')).toHaveTextContent('Field not defined');
  });

  it('shows the edit button when user has update permissions', () => {
    renderWithTestingProviders(<EditTextField {...defaultProps} />);

    expect(screen.getByTestId('edit-text-field-edit-button')).toBeInTheDocument();
  });

  it('hides the edit button when user lacks update permissions', () => {
    renderWithTestingProviders(<EditTextField {...defaultProps} />, {
      wrapperProps: { permissions: readCasesPermissions() },
    });

    expect(screen.queryByTestId('edit-text-field-edit-button')).not.toBeInTheDocument();
  });

  it('hides the edit button when loading', () => {
    renderWithTestingProviders(<EditTextField {...defaultProps} isLoading />);

    expect(screen.queryByTestId('edit-text-field-edit-button')).not.toBeInTheDocument();
  });

  it('shows the text input when the edit button is clicked', async () => {
    renderWithTestingProviders(<EditTextField {...defaultProps} />);

    await user.click(screen.getByTestId('edit-text-field-edit-button'));

    expect(screen.getByTestId('edit-text-field-input')).toBeInTheDocument();
    expect(screen.getByTestId('edit-text-field-submit')).toBeInTheDocument();
    expect(screen.getByTestId('edit-text-field-cancel')).toBeInTheDocument();
  });

  it('calls onSubmit with the trimmed updated value and closes the editor', async () => {
    renderWithTestingProviders(<EditTextField {...defaultProps} />);

    await user.click(screen.getByTestId('edit-text-field-edit-button'));
    const input = screen.getByTestId('edit-text-field-input');
    await user.clear(input);
    await user.type(input, '  updated value  ');
    await user.click(screen.getByTestId('edit-text-field-submit'));

    expect(onSubmit).toHaveBeenCalledWith('updated value');
    expect(screen.queryByTestId('edit-text-field-input')).not.toBeInTheDocument();
  });

  it('does not call onSubmit when cancel is clicked', async () => {
    renderWithTestingProviders(<EditTextField {...defaultProps} />);

    await user.click(screen.getByTestId('edit-text-field-edit-button'));
    const input = screen.getByTestId('edit-text-field-input');
    await user.clear(input);
    await user.type(input, 'changed');
    await user.click(screen.getByTestId('edit-text-field-cancel'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByTestId('edit-text-field-input')).not.toBeInTheDocument();
  });

  it('uses a custom data-test-subj', () => {
    renderWithTestingProviders(<EditTextField {...defaultProps} data-test-subj="my-text-field" />);

    expect(screen.getByTestId('my-text-field-value')).toBeInTheDocument();
  });
});
