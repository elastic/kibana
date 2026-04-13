/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Search } from './search';

describe('Search', () => {
  test('it renders the field search input with the expected placeholder text when the searchInput prop is empty', () => {
    render(<Search isSearching={false} onSearchInputChange={jest.fn()} searchInput="" />);

    expect(screen.getByRole('searchbox').getAttribute('placeholder')).toEqual('Field name');
  });

  test('it renders the "current" search value in the input when searchInput is not empty', () => {
    const searchInput = 'aFieldName';

    render(
      <Search isSearching={false} onSearchInputChange={jest.fn()} searchInput={searchInput} />
    );

    expect(screen.getByRole('searchbox')).toHaveValue(searchInput);
  });

  test('it renders the field search input with a spinner when isSearching is true', () => {
    const { container } = render(
      <Search isSearching={true} onSearchInputChange={jest.fn()} searchInput="" />
    );

    expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
  });

  test('it invokes onSearchInputChange when the user types in the search field', async () => {
    const onSearchInputChange = jest.fn();

    render(<Search isSearching={false} onSearchInputChange={onSearchInputChange} searchInput="" />);

    await userEvent.type(screen.getByRole('searchbox'), 'timestamp');

    expect(onSearchInputChange).toBeCalled();
  });
});
