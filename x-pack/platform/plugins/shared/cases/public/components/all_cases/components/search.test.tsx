/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';

import { TableSearch } from './search';

describe('TableSearch', () => {
  const onFilterOptionsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with empty value correctly', () => {
    renderWithKibanaRenderContext(
      <TableSearch filterOptionsSearch="" onFilterOptionsChange={onFilterOptionsChange} />
    );

    expect(screen.getByTestId('search-cases')).toHaveValue('');
  });

  it('renders with initial value correctly', () => {
    renderWithKibanaRenderContext(
      <TableSearch filterOptionsSearch="My search" onFilterOptionsChange={onFilterOptionsChange} />
    );

    expect(screen.getByTestId('search-cases')).toHaveValue('My search');
  });

  it('calls onFilterOptionsChange correctly', async () => {
    renderWithKibanaRenderContext(
      <TableSearch filterOptionsSearch="" onFilterOptionsChange={onFilterOptionsChange} />
    );

    await userEvent.type(screen.getByTestId('search-cases'), 'My search{enter}');

    expect(onFilterOptionsChange).toHaveBeenCalledWith({ search: 'My search' });
  });

  it('calls onFilterOptionsChange if the search term is empty', async () => {
    renderWithKibanaRenderContext(
      <TableSearch filterOptionsSearch="" onFilterOptionsChange={onFilterOptionsChange} />
    );

    await userEvent.type(screen.getByTestId('search-cases'), '      {enter}');

    expect(onFilterOptionsChange).toHaveBeenCalledWith({ search: '' });
  });

  it('calls onFilterOptionsChange when clearing the search bar', async () => {
    renderWithKibanaRenderContext(
      <TableSearch filterOptionsSearch="My search" onFilterOptionsChange={onFilterOptionsChange} />
    );

    await userEvent.click(screen.getByTestId('clearSearchButton'));

    expect(onFilterOptionsChange).toHaveBeenCalledWith({ search: '' });
  });
});
