/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import type { EditComboboxFieldProps } from './edit_combobox_field';
import { EditComboboxField } from './edit_combobox_field';
import { readCasesPermissions, renderWithTestingProviders } from '../../../common/mock';

const onSubmit = jest.fn();
const defaultProps: EditComboboxFieldProps = {
  title: 'Tags',
  value: ['alpha', 'beta'],
  options: ['alpha', 'beta', 'gamma'],
  onSubmit,
  isLoading: false,
};

describe('EditComboboxField', () => {
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
    renderWithTestingProviders(<EditComboboxField {...defaultProps} />);

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByTestId('edit-combobox-field-value')).toHaveTextContent('alpha, beta');
  });

  it('renders "Field not defined" when value is empty', () => {
    renderWithTestingProviders(<EditComboboxField {...defaultProps} value={[]} />);

    expect(screen.getByTestId('edit-combobox-field-value')).toHaveTextContent('Field not defined');
  });

  it('shows the edit button when user has update permissions', () => {
    renderWithTestingProviders(<EditComboboxField {...defaultProps} />);

    expect(screen.getByTestId('edit-combobox-field-edit-button')).toBeInTheDocument();
  });

  it('hides the edit button when user lacks update permissions', () => {
    renderWithTestingProviders(<EditComboboxField {...defaultProps} />, {
      wrapperProps: { permissions: readCasesPermissions() },
    });

    expect(screen.queryByTestId('edit-combobox-field-edit-button')).not.toBeInTheDocument();
  });

  it('hides the edit button when loading', () => {
    renderWithTestingProviders(<EditComboboxField {...defaultProps} isLoading />);

    expect(screen.queryByTestId('edit-combobox-field-edit-button')).not.toBeInTheDocument();
  });

  it('shows the combobox input when the edit button is clicked', async () => {
    renderWithTestingProviders(<EditComboboxField {...defaultProps} />);

    await user.click(screen.getByTestId('edit-combobox-field-edit-button'));

    expect(screen.getByTestId('edit-combobox-field-input')).toBeInTheDocument();
    expect(screen.getByTestId('edit-combobox-field-submit')).toBeInTheDocument();
    expect(screen.getByTestId('edit-combobox-field-cancel')).toBeInTheDocument();
  });

  it('calls onSubmit with the current selection when save is clicked', async () => {
    renderWithTestingProviders(<EditComboboxField {...defaultProps} />);

    await user.click(screen.getByTestId('edit-combobox-field-edit-button'));
    await user.click(screen.getByTestId('edit-combobox-field-submit'));

    expect(onSubmit).toHaveBeenCalledWith(['alpha', 'beta']);
    expect(screen.queryByTestId('edit-combobox-field-input')).not.toBeInTheDocument();
  });

  it('does not call onSubmit when cancel is clicked', async () => {
    renderWithTestingProviders(<EditComboboxField {...defaultProps} />);

    await user.click(screen.getByTestId('edit-combobox-field-edit-button'));
    await user.click(screen.getByTestId('edit-combobox-field-cancel'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByTestId('edit-combobox-field-input')).not.toBeInTheDocument();
  });

  it('uses a custom data-test-subj', () => {
    renderWithTestingProviders(
      <EditComboboxField {...defaultProps} data-test-subj="my-combo-field" />
    );

    expect(screen.getByTestId('my-combo-field-value')).toBeInTheDocument();
  });
});
