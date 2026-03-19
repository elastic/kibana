/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, fireEvent } from '@testing-library/react';

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
    owner: [],
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

    await waitFor(() => {
      expect(screen.getByTestId('templates-table-filters')).toBeInTheDocument();
    });
    expect(screen.getByTestId('templates-search')).toBeInTheDocument();
    expect(screen.getByTestId('templates-refresh-button')).toBeInTheDocument();
  });

  it('calls onQueryParamsChange when search is performed', async () => {
    renderWithTestingProviders(
      <TemplatesTableFilters
        queryParams={defaultQueryParams}
        onQueryParamsChange={onQueryParamsChange}
        onRefresh={onRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('templates-search')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByTestId('templates-search'), 'test search{enter}');

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

    await waitFor(() => {
      expect(screen.getByTestId('templates-refresh-button')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('templates-refresh-button'));

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

    await waitFor(() => {
      expect(screen.getByTestId('templates-refresh-button')).toBeInTheDocument();
    });

    const refreshButton = screen.getByTestId('templates-refresh-button');
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

    await waitFor(() => {
      expect(screen.getByDisplayValue('existing search')).toBeInTheDocument();
    });
  });

  it('renders the status filter select', async () => {
    renderWithTestingProviders(
      <TemplatesTableFilters
        queryParams={defaultQueryParams}
        onQueryParamsChange={onQueryParamsChange}
        onRefresh={onRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('templates-status-filter')).toBeInTheDocument();
    });
  });

  it('calls onQueryParamsChange with isEnabled: false when Disabled is selected', async () => {
    renderWithTestingProviders(
      <TemplatesTableFilters
        queryParams={defaultQueryParams}
        onQueryParamsChange={onQueryParamsChange}
        onRefresh={onRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('templates-status-filter')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('templates-status-filter'), {
      target: { value: 'false' },
    });

    expect(onQueryParamsChange).toHaveBeenCalledWith({ isEnabled: false, page: 1 });
  });

  it('calls onQueryParamsChange with isEnabled: true when Enabled is selected', async () => {
    renderWithTestingProviders(
      <TemplatesTableFilters
        queryParams={{ ...defaultQueryParams, isEnabled: false }}
        onQueryParamsChange={onQueryParamsChange}
        onRefresh={onRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('templates-status-filter')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('templates-status-filter'), {
      target: { value: 'true' },
    });

    expect(onQueryParamsChange).toHaveBeenCalledWith({ isEnabled: true, page: 1 });
  });

  it('calls onQueryParamsChange with isEnabled: undefined when Show all is selected', async () => {
    renderWithTestingProviders(
      <TemplatesTableFilters
        queryParams={{ ...defaultQueryParams, isEnabled: false }}
        onQueryParamsChange={onQueryParamsChange}
        onRefresh={onRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('templates-status-filter')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('templates-status-filter'), {
      target: { value: '' },
    });

    expect(onQueryParamsChange).toHaveBeenCalledWith({ isEnabled: undefined, page: 1 });
  });

  it('shows disabled as selected value when queryParams.isEnabled is false', async () => {
    renderWithTestingProviders(
      <TemplatesTableFilters
        queryParams={{ ...defaultQueryParams, isEnabled: false }}
        onQueryParamsChange={onQueryParamsChange}
        onRefresh={onRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('templates-status-filter')).toHaveValue('false');
    });
  });

  it('shows enabled as selected value when queryParams.isEnabled is true', async () => {
    renderWithTestingProviders(
      <TemplatesTableFilters
        queryParams={{ ...defaultQueryParams, isEnabled: true }}
        onQueryParamsChange={onQueryParamsChange}
        onRefresh={onRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('templates-status-filter')).toHaveValue('true');
    });
  });

  it('shows show all as selected value when queryParams.isEnabled is undefined', async () => {
    renderWithTestingProviders(
      <TemplatesTableFilters
        queryParams={defaultQueryParams}
        onQueryParamsChange={onQueryParamsChange}
        onRefresh={onRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('templates-status-filter')).toHaveValue('');
    });
  });
});
