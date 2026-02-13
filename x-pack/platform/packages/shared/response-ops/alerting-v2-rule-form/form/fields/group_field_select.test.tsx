/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { GroupFieldSelect } from './group_field_select';
import type { FormValues } from '../types';
import { useQueryColumns } from '../hooks/use_query_columns';

jest.mock('../hooks/use_query_columns');

const mockUseQueryColumns = jest.mocked(useQueryColumns);

const createMockServices = () => ({
  data: {
    search: {
      search: jest.fn(),
    },
  },
});

const createWrapper = (defaultValues: Partial<FormValues> = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const form = useForm<FormValues>({
      defaultValues: {
        kind: 'alert',
        name: '',
        description: '',
        tags: [],
        schedule: { custom: '5m' },
        lookbackWindow: '5m',
        timeField: '',
        enabled: true,
        query: 'FROM logs-* | STATS count() BY host.name',
        groupingKey: [],
        ...defaultValues,
      },
    });

    return (
      <QueryClientProvider client={queryClient}>
        <FormProvider {...form}>{children}</FormProvider>
      </QueryClientProvider>
    );
  };

  return Wrapper;
};

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

  it('renders with label', () => {
    const Wrapper = createWrapper();
    const services = createMockServices();

    render(
      <Wrapper>
        <GroupFieldSelect services={services as any} />
      </Wrapper>
    );

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

    const Wrapper = createWrapper();
    const services = createMockServices();

    render(
      <Wrapper>
        <GroupFieldSelect services={services as any} />
      </Wrapper>
    );

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

    const Wrapper = createWrapper({ groupingKey: ['host.name'] });
    const services = createMockServices();

    render(
      <Wrapper>
        <GroupFieldSelect services={services as any} />
      </Wrapper>
    );

    // Check that the selected value is shown as a pill/badge
    expect(screen.getByText('host.name')).toBeInTheDocument();
  });

  it('calls useQueryColumns with query from form', () => {
    const Wrapper = createWrapper({ query: 'FROM metrics-* | STATS avg(value) BY region' });
    const services = createMockServices();

    render(
      <Wrapper>
        <GroupFieldSelect services={services as any} />
      </Wrapper>
    );

    expect(mockUseQueryColumns).toHaveBeenCalledWith({
      query: 'FROM metrics-* | STATS avg(value) BY region',
      search: expect.any(Function),
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

    const Wrapper = createWrapper();
    const services = createMockServices();

    render(
      <Wrapper>
        <GroupFieldSelect services={services as any} />
      </Wrapper>
    );

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

    const Wrapper = createWrapper();
    const services = createMockServices();

    render(
      <Wrapper>
        <GroupFieldSelect services={services as any} />
      </Wrapper>
    );

    // Component should still render, just with no options
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
