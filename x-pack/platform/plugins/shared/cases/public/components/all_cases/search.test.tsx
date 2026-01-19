/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

import { TableSearch } from './search';
import { renderWithTestingProviders } from '../../common/mock';

describe('TableSearch', () => {
  const onFilterOptionsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with empty value correctly', async () => {
    renderWithTestingProviders(
      <TableSearch filterOptionsSearch="" onFilterOptionsChange={onFilterOptionsChange} />
    );

    await screen.findByDisplayValue('');
  });

  it('renders with initial value correctly', async () => {
    renderWithTestingProviders(
      <TableSearch filterOptionsSearch="My search" onFilterOptionsChange={onFilterOptionsChange} />
    );

    await screen.findByDisplayValue('My search');
  });

  it('calls onFilterOptionsChange correctly', async () => {
    renderWithTestingProviders(
      <TableSearch filterOptionsSearch="" onFilterOptionsChange={onFilterOptionsChange} />
    );

    await userEvent.type(await screen.findByTestId('search-cases'), 'My search{enter}');

    expect(onFilterOptionsChange).toHaveBeenCalledWith({ search: 'My search' });
  });

  it('calls onFilterOptionsChange if the search term is empty', async () => {
    renderWithTestingProviders(
      <TableSearch filterOptionsSearch="" onFilterOptionsChange={onFilterOptionsChange} />
    );

    await userEvent.type(await screen.findByTestId('search-cases'), '      {enter}');

    expect(onFilterOptionsChange).toHaveBeenCalledWith({ search: '' });
  });

  it('calls onFilterOptionsChange when clearing the search bar', async () => {
    renderWithTestingProviders(
      <TableSearch filterOptionsSearch="My search" onFilterOptionsChange={onFilterOptionsChange} />
    );

    await screen.findByDisplayValue('My search');

    await userEvent.click(await screen.findByTestId('clearSearchButton'));

    expect(onFilterOptionsChange).toHaveBeenCalledWith({ search: '' });
  });
});
