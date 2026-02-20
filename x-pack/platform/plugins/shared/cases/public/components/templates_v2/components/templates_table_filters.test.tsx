/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

import { TemplatesTableFilters } from './templates_table_filters';
import { renderWithTestingProviders } from '../../../common/mock';
import type { TemplatesFindRequest } from '../../../../common/types/api/template/v1';

describe('TemplatesTableFilters', () => {
  const defaultQueryParams: TemplatesFindRequest = {
    page: 1,
    perPage: 10,
    sortField: 'name',
    sortOrder: 'asc',
    search: '',
    tags: [],
    author: [],
    isDeleted: false,
  };

  const onQueryParamsChange = jest.fn();
  const onRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(
      <TemplatesTableFilters
        queryParams={defaultQueryParams}
        onQueryParamsChange={onQueryParamsChange}
        onRefresh={onRefresh}
      />
    );

    expect(await screen.findByTestId('templates-table-filters')).toBeInTheDocument();
    expect(await screen.findByTestId('templates-search')).toBeInTheDocument();
    expect(await screen.findByTestId('templates-refresh-button')).toBeInTheDocument();
  });

  it('calls onQueryParamsChange when search is performed', async () => {
    renderWithTestingProviders(
      <TemplatesTableFilters
        queryParams={defaultQueryParams}
        onQueryParamsChange={onQueryParamsChange}
        onRefresh={onRefresh}
      />
    );

    await userEvent.type(await screen.findByTestId('templates-search'), 'test search{enter}');

    expect(onQueryParamsChange).toHaveBeenCalledWith({ search: 'test search', page: 1 });
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    renderWithTestingProviders(
      <TemplatesTableFilters
        queryParams={defaultQueryParams}
        onQueryParamsChange={onQueryParamsChange}
        onRefresh={onRefresh}
      />
    );

    await userEvent.click(await screen.findByTestId('templates-refresh-button'));

    expect(onRefresh).toHaveBeenCalled();
  });

  it('shows loading state on refresh button when isLoading is true', async () => {
    renderWithTestingProviders(
      <TemplatesTableFilters
        queryParams={defaultQueryParams}
        onQueryParamsChange={onQueryParamsChange}
        onRefresh={onRefresh}
        isLoading={true}
      />
    );

    const refreshButton = await screen.findByTestId('templates-refresh-button');
    expect(refreshButton).toHaveAttribute('aria-label', 'Refresh templates');
  });

  it('displays the current search value', async () => {
    const queryParamsWithSearch = {
      ...defaultQueryParams,
      search: 'existing search',
    };

    renderWithTestingProviders(
      <TemplatesTableFilters
        queryParams={queryParamsWithSearch}
        onQueryParamsChange={onQueryParamsChange}
        onRefresh={onRefresh}
      />
    );

    expect(await screen.findByDisplayValue('existing search')).toBeInTheDocument();
  });
});
