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
import { MAX_CATEGORY_LENGTH } from '../../../../../../common/constants';
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

  it('persists a valid change immediately, with no confirm step', async () => {
    renderWithTestingProviders(<CategoryField {...defaultProps} />);

    await user.type(screen.getByRole('combobox'), `${categories[0]}{enter}`);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(categories[0]));
    expect(screen.queryByTestId('template-field-confirm-category')).not.toBeInTheDocument();
    expect(screen.queryByTestId('template-field-cancel-category')).not.toBeInTheDocument();
  });

  it('trims the category before submitting', async () => {
    renderWithTestingProviders(<CategoryField {...defaultProps} />);

    await user.type(screen.getByRole('combobox'), 'category-with-space            {enter}');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('category-with-space'));
  });

  it('submits null when the category is cleared', async () => {
    renderWithTestingProviders(<CategoryField {...defaultProps} category="My category" />);

    await user.click(screen.getByTestId('comboBoxClearButton'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(null));
  });

  it('shows an error and does not submit when the category is too long', async () => {
    const longCategory = 'a'.repeat(MAX_CATEGORY_LENGTH + 1);

    renderWithTestingProviders(<CategoryField {...defaultProps} />);

    await user.type(screen.getByRole('combobox'), `${longCategory}{enter}`);

    expect(
      await screen.findByText(
        `The length of the category is too long. The maximum length is ${MAX_CATEGORY_LENGTH} characters.`
      )
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows an error and does not submit when the category is only whitespace', async () => {
    renderWithTestingProviders(<CategoryField {...defaultProps} />);

    await user.type(screen.getByRole('combobox'), '   {enter}');

    expect(await screen.findByText('Empty category is not allowed')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
