/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { readCasesPermissions, renderWithTestingProviders } from '../../../../../common/mock';
import { useGetCategories } from '../../../../../containers/use_get_categories';
import { categories } from '../../../../../containers/mock';
import type { CategoryFieldProps } from './category_field';
import { CategoryField } from './category_field';

jest.mock('../../../../../containers/use_get_categories');

const useGetCategoriesMock = useGetCategories as jest.Mock;
const onSubmit = jest.fn();

const defaultProps: CategoryFieldProps = {
  isLoading: false,
  onSubmit,
  category: null,
};

describe('CategoryField', () => {
  let user: UserEvent;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    useGetCategoriesMock.mockReturnValue({ data: categories, isLoading: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the category combo box directly, without an edit button', () => {
    renderWithTestingProviders(<CategoryField {...defaultProps} />);

    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByTestId('categories-list')).toBeInTheDocument();
    expect(screen.queryByTestId('category-edit-button')).not.toBeInTheDocument();
  });

  it('renders the current category value', () => {
    renderWithTestingProviders(<CategoryField {...defaultProps} category="sample" />);

    expect(screen.getByDisplayValue('sample')).toBeInTheDocument();
  });

  it('disables the combo box while loading', () => {
    renderWithTestingProviders(<CategoryField {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('comboBoxSearchInput')).toBeDisabled();
  });

  it('disables the combo box when the user does not have update permissions', () => {
    renderWithTestingProviders(<CategoryField {...defaultProps} />, {
      wrapperProps: { permissions: readCasesPermissions() },
    });

    expect(screen.getByTestId('comboBoxSearchInput')).toBeDisabled();
  });

  it('does not call onSubmit until the change is confirmed', async () => {
    renderWithTestingProviders(<CategoryField {...defaultProps} />);

    await user.type(screen.getByRole('combobox'), `${categories[0]}{enter}`);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('template-field-confirm-category')).toBeInTheDocument();
    expect(screen.getByTestId('template-field-cancel-category')).toBeInTheDocument();

    await user.click(screen.getByTestId('template-field-confirm-category'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(categories[0]));
  });

  it('reverts the pending change when cancel is clicked', async () => {
    renderWithTestingProviders(<CategoryField {...defaultProps} category="My category" />);

    await user.click(screen.getByTestId('comboBoxClearButton'));

    await waitFor(() => {
      expect(screen.getByTestId('template-field-cancel-category')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('template-field-cancel-category'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('My category')).toBeInTheDocument();
    expect(screen.queryByTestId('template-field-confirm-category')).not.toBeInTheDocument();
  });

  it('trims the category before submitting', async () => {
    renderWithTestingProviders(<CategoryField {...defaultProps} />);

    await user.type(screen.getByRole('combobox'), 'category-with-space            {enter}');
    await user.click(screen.getByTestId('template-field-confirm-category'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('category-with-space'));
  });

  it('submits null when the category is cleared', async () => {
    renderWithTestingProviders(<CategoryField {...defaultProps} category="My category" />);

    await user.click(screen.getByTestId('comboBoxClearButton'));
    await user.click(screen.getByTestId('template-field-confirm-category'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(null));
  });
});
