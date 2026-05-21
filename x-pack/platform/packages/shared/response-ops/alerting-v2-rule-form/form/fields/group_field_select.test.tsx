/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  createFormWrapper,
  createMockServices,
  defaultTestFormValues,
  createTestQueryClient,
} from '../../test_utils';
import type { FormValues } from '../types';
import { RuleFormProvider, type RuleFormServices } from '../contexts';
import { GroupFieldSelect } from './group_field_select';
import { useQueryColumns } from '../hooks/use_query_columns';
import { getGroupByColumnsFromQuery } from '../hooks/use_default_group_by';

jest.mock('../hooks/use_query_columns');
jest.mock('../hooks/use_default_group_by', () => ({
  getGroupByColumnsFromQuery: jest.fn(() => []),
}));

const mockGetGroupByColumnsFromQuery = jest.mocked(getGroupByColumnsFromQuery);
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

    // Select an option wrapped in waitFor to handle EuiComboBox transition timing
    await waitFor(async () => {
      await userEvent.click(screen.getByText('host.name'));
    });

    // Verify selection is shown as a badge/pill
    await waitFor(() => {
      const badges = screen.getAllByText('host.name');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders correctly in flyout layout', () => {
    render(<GroupFieldSelect />, {
      wrapper: createFormWrapper({ evaluation: { query: { base: defaultQuery } } }, mockServices, {
        layout: 'flyout',
      }),
    });

    expect(screen.getByRole('combobox')).toBeInTheDocument();
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

  describe('auto-populate from query BY clause', () => {
    const QueryChanger = ({ newQuery }: { newQuery: string }) => {
      const { setValue } = useFormContext<FormValues>();
      return (
        <button onClick={() => setValue('evaluation.query.base', newQuery)}>Change Query</button>
      );
    };

    const renderWithQueryChanger = (
      initialQuery: string,
      newQuery: string,
      initialGroupingFields?: string[],
      services: RuleFormServices = mockServices
    ) => {
      const queryClient = createTestQueryClient();

      const Wrapper = ({ children }: { children: React.ReactNode }) => {
        const form = useForm<FormValues>({
          defaultValues: {
            ...defaultTestFormValues,
            evaluation: { query: { base: initialQuery } },
            grouping: initialGroupingFields ? { fields: initialGroupingFields } : undefined,
          },
        });

        return (
          <IntlProvider locale="en">
            <QueryClientProvider client={queryClient}>
              <FormProvider {...form}>
                <RuleFormProvider services={services} meta={{ layout: 'page' }}>
                  {children}
                  <QueryChanger newQuery={newQuery} />
                </RuleFormProvider>
              </FormProvider>
            </QueryClientProvider>
          </IntlProvider>
        );
      };

      return render(<GroupFieldSelect />, { wrapper: Wrapper });
    };

    it('auto-populates group fields when query BY clause changes', async () => {
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

      mockGetGroupByColumnsFromQuery.mockImplementation((q: string) => {
        if (q.includes('BY service.name')) return ['service.name'];
        if (q.includes('BY host.name')) return ['host.name'];
        return [];
      });

      renderWithQueryChanger(
        'FROM logs-* | STATS count() BY host.name',
        'FROM logs-* | STATS count() BY service.name',
        ['host.name']
      );

      // Initially should show host.name (set via form defaults)
      expect(screen.getByText('host.name')).toBeInTheDocument();

      // Change query to use service.name in BY clause
      await userEvent.click(screen.getByText('Change Query'));

      // Should now show service.name (auto-populated from new BY clause)
      await waitFor(() => {
        expect(screen.getByText('service.name')).toBeInTheDocument();
      });
    });

    it('clears group fields when BY clause is removed', async () => {
      mockUseQueryColumns.mockReturnValue({
        data: [
          { name: 'host.name', type: 'keyword' },
          { name: 'count', type: 'long' },
        ],
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
        isFetching: false,
        status: 'success',
        fetchStatus: 'idle',
      } as any);

      mockGetGroupByColumnsFromQuery.mockImplementation((q: string) => {
        if (q.includes('BY host.name')) return ['host.name'];
        return [];
      });

      renderWithQueryChanger(
        'FROM logs-* | STATS count() BY host.name',
        'FROM logs-* | STATS count()',
        ['host.name']
      );

      // Initially should show host.name
      expect(screen.getByText('host.name')).toBeInTheDocument();

      // Change query to remove BY clause
      await userEvent.click(screen.getByText('Change Query'));

      // host.name should no longer be shown
      await waitFor(() => {
        expect(screen.queryByText('host.name')).not.toBeInTheDocument();
      });
    });
  });
});
