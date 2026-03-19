/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFormWrapper, createMockServices } from '../../test_utils';
import { GroupFieldSelect } from './group_field_select';
import { useQueryColumns } from '../hooks/use_query_columns';

jest.mock('../hooks/use_query_columns');

const mockUseQueryColumns = jest.mocked(useQueryColumns);

const mockServices = createMockServices();

describe('GroupFieldSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryColumns.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isFetching: false,
      status: 'success',
      fetchStatus: 'idle',
    } as any);
  });

  const defaultQuery = 'FROM logs-* | STATS count() BY host.name';

  it('renders with label', () => {
    render(<GroupFieldSelect />, {
      wrapper: createFormWrapper({ evaluation: { query: { base: defaultQuery } } }, mockServices),
    });

    expect(screen.getByText('Group Fields')).toBeInTheDocument();
  });

  it('displays columns as options', async () => {
    mockUseQueryColumns.mockReturnValue({
      data: [
        { name: 'host.name', type: 'keyword' },
        { name: 'service.name', type: 'keyword' },
      ],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isFetching: false,
      status: 'success',
      fetchStatus: 'idle',
    } as any);

    render(<GroupFieldSelect />, {
      wrapper: createFormWrapper({ evaluation: { query: { base: defaultQuery } } }, mockServices),
    });

    // Click to open the combo box
    const comboBox = screen.getByRole('combobox');
    await userEvent.click(comboBox);

    // Check options are displayed
    await waitFor(() => {
      expect(screen.getByText('host.name')).toBeInTheDocument();
      expect(screen.getByText('service.name')).toBeInTheDocument();
    });
  });

  it('shows selected values', () => {
    mockUseQueryColumns.mockReturnValue({
      data: [
        { name: 'host.name', type: 'keyword' },
        { name: 'service.name', type: 'keyword' },
      ],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isFetching: false,
      status: 'success',
      fetchStatus: 'idle',
    } as any);

    render(<GroupFieldSelect />, {
      wrapper: createFormWrapper(
        {
          evaluation: { query: { base: defaultQuery } },
          grouping: { fields: ['host.name'] },
        },
        mockServices
      ),
    });

    // Check that the selected value is shown as a pill/badge
    expect(screen.getByText('host.name')).toBeInTheDocument();
  });

  it('calls useQueryColumns with query and onSuccess from form', () => {
    render(<GroupFieldSelect />, {
      wrapper: createFormWrapper(
        {
          evaluation: {
            query: {
              base: 'FROM metrics-* | STATS avg(value) BY region',
            },
          },
        },
        mockServices
      ),
    });

    expect(mockUseQueryColumns).toHaveBeenCalledWith({
      query: 'FROM metrics-* | STATS avg(value) BY region',
      search: expect.any(Function),
      onSuccess: expect.any(Function),
    });
  });

  it('allows selecting a column', async () => {
    mockUseQueryColumns.mockReturnValue({
      data: [
        { name: 'host.name', type: 'keyword' },
        { name: 'service.name', type: 'keyword' },
      ],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isFetching: false,
      status: 'success',
      fetchStatus: 'idle',
    } as any);

    render(<GroupFieldSelect />, {
      wrapper: createFormWrapper({ evaluation: { query: { base: defaultQuery } } }, mockServices),
    });

    // Click to open the combo box
    const comboBox = screen.getByRole('combobox');
    await userEvent.click(comboBox);

    // Select an option
    await waitFor(() => {
      expect(screen.getByText('host.name')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('host.name'));

    // Verify selection is shown
    await waitFor(() => {
      // The selected item should appear as a badge/pill
      const badges = screen.getAllByText('host.name');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders empty when no columns available', () => {
    mockUseQueryColumns.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isFetching: false,
      status: 'success',
      fetchStatus: 'idle',
    } as any);

    render(<GroupFieldSelect />, {
      wrapper: createFormWrapper({ evaluation: { query: { base: defaultQuery } } }, mockServices),
    });

    // Component should still render, just with no options
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
