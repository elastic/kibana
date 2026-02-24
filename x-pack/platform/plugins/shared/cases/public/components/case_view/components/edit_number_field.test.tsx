/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import type { EditNumberFieldProps } from './edit_number_field';
import { EditNumberField } from './edit_number_field';
import { readCasesPermissions, renderWithTestingProviders } from '../../../common/mock';

const onSubmit = jest.fn();
const defaultProps: EditNumberFieldProps = {
  title: 'Priority',
  value: '5',
  onSubmit,
  isLoading: false,
};

describe('EditNumberField', () => {
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
    renderWithTestingProviders(<EditNumberField {...defaultProps} />);

    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByTestId('edit-number-field-value')).toHaveTextContent('5');
  });

  it('renders "Field not defined" when value is empty', () => {
    renderWithTestingProviders(<EditNumberField {...defaultProps} value="" />);

    expect(screen.getByTestId('edit-number-field-value')).toHaveTextContent('Field not defined');
  });

  it('shows the edit button when user has update permissions', () => {
    renderWithTestingProviders(<EditNumberField {...defaultProps} />);

    expect(screen.getByTestId('edit-number-field-edit-button')).toBeInTheDocument();
  });

  it('hides the edit button when user lacks update permissions', () => {
    renderWithTestingProviders(<EditNumberField {...defaultProps} />, {
      wrapperProps: { permissions: readCasesPermissions() },
    });

    expect(screen.queryByTestId('edit-number-field-edit-button')).not.toBeInTheDocument();
  });

  it('hides the edit button when loading', () => {
    renderWithTestingProviders(<EditNumberField {...defaultProps} isLoading />);

    expect(screen.queryByTestId('edit-number-field-edit-button')).not.toBeInTheDocument();
  });

  it('shows the number input when the edit button is clicked', async () => {
    renderWithTestingProviders(<EditNumberField {...defaultProps} />);

    await user.click(screen.getByTestId('edit-number-field-edit-button'));

    expect(screen.getByTestId('edit-number-field-input')).toBeInTheDocument();
    expect(screen.getByTestId('edit-number-field-submit')).toBeInTheDocument();
    expect(screen.getByTestId('edit-number-field-cancel')).toBeInTheDocument();
  });

  it('calls onSubmit with the updated value and closes the editor', async () => {
    renderWithTestingProviders(<EditNumberField {...defaultProps} />);

    await user.click(screen.getByTestId('edit-number-field-edit-button'));
    const input = screen.getByTestId('edit-number-field-input');
    await user.clear(input);
    await user.type(input, '10');
    await user.click(screen.getByTestId('edit-number-field-submit'));

    expect(onSubmit).toHaveBeenCalledWith('10');
    expect(screen.queryByTestId('edit-number-field-input')).not.toBeInTheDocument();
  });

  it('does not call onSubmit when cancel is clicked', async () => {
    renderWithTestingProviders(<EditNumberField {...defaultProps} />);

    await user.click(screen.getByTestId('edit-number-field-edit-button'));
    const input = screen.getByTestId('edit-number-field-input');
    await user.clear(input);
    await user.type(input, '99');
    await user.click(screen.getByTestId('edit-number-field-cancel'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByTestId('edit-number-field-input')).not.toBeInTheDocument();
  });

  it('uses a custom data-test-subj', () => {
    renderWithTestingProviders(
      <EditNumberField {...defaultProps} data-test-subj="my-number-field" />
    );

    expect(screen.getByTestId('my-number-field-value')).toBeInTheDocument();
  });
});
