/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

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

    expect(screen.getByTestId('templates-refresh-button')).toHaveAttribute(
      'aria-label',
      'Refresh templates'
    );
  });

  it('displays the current search value', async () => {
    renderWithTestingProviders(
      <TemplatesTableFilters
        queryParams={{ ...defaultQueryParams, search: 'existing search' }}
        onQueryParamsChange={onQueryParamsChange}
        onRefresh={onRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('existing search')).toBeInTheDocument();
    });
  });

  describe('status filter', () => {
    it('renders the status filter button', async () => {
      renderWithTestingProviders(
        <TemplatesTableFilters
          queryParams={defaultQueryParams}
          onQueryParamsChange={onQueryParamsChange}
          onRefresh={onRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('options-filter-popover-button-status')).toBeInTheDocument();
      });
    });

    it('shows Enabled and Disabled options in the popover', async () => {
      renderWithTestingProviders(
        <TemplatesTableFilters
          queryParams={defaultQueryParams}
          onQueryParamsChange={onQueryParamsChange}
          onRefresh={onRefresh}
        />
      );

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));
      await waitForEuiPopoverOpen();

      expect(screen.getByRole('option', { name: 'Enabled' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Disabled' })).toBeInTheDocument();
    });

    it('sends isEnabled: false when Enabled is deselected (only Disabled remains)', async () => {
      renderWithTestingProviders(
        <TemplatesTableFilters
          queryParams={defaultQueryParams}
          onQueryParamsChange={onQueryParamsChange}
          onRefresh={onRefresh}
        />
      );

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));
      await waitForEuiPopoverOpen();

      await userEvent.click(screen.getByRole('option', { name: 'Enabled' }));

      await waitFor(() => {
        expect(onQueryParamsChange).toHaveBeenCalledWith({ isEnabled: false, page: 1 });
      });
    });

    it('sends isEnabled: true when Disabled is deselected (only Enabled remains)', async () => {
      renderWithTestingProviders(
        <TemplatesTableFilters
          queryParams={defaultQueryParams}
          onQueryParamsChange={onQueryParamsChange}
          onRefresh={onRefresh}
        />
      );

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));
      await waitForEuiPopoverOpen();

      await userEvent.click(screen.getByRole('option', { name: 'Disabled' }));

      await waitFor(() => {
        expect(onQueryParamsChange).toHaveBeenCalledWith({ isEnabled: true, page: 1 });
      });
    });

    it('sends isEnabled: undefined when both options are selected', async () => {
      renderWithTestingProviders(
        <TemplatesTableFilters
          queryParams={{ ...defaultQueryParams, isEnabled: false }}
          onQueryParamsChange={onQueryParamsChange}
          onRefresh={onRefresh}
        />
      );

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));
      await waitForEuiPopoverOpen();

      await userEvent.click(screen.getByRole('option', { name: 'Enabled' }));

      await waitFor(() => {
        expect(onQueryParamsChange).toHaveBeenCalledWith({ isEnabled: undefined, page: 1 });
      });
    });

    it('sends isEnabled: undefined when both options are deselected', async () => {
      renderWithTestingProviders(
        <TemplatesTableFilters
          queryParams={{ ...defaultQueryParams, isEnabled: true }}
          onQueryParamsChange={onQueryParamsChange}
          onRefresh={onRefresh}
        />
      );

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));
      await waitForEuiPopoverOpen();

      await userEvent.click(screen.getByRole('option', { name: 'Enabled' }));

      await waitFor(() => {
        expect(onQueryParamsChange).toHaveBeenCalledWith({ isEnabled: undefined, page: 1 });
      });
    });
  });
});
