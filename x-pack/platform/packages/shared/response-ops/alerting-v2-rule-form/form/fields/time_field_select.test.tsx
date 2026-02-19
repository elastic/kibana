/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { TimeFieldSelect } from './time_field_select';
import { createFormWrapper } from '../../test_utils';
import * as useDataFieldsModule from '../hooks/use_data_fields';

jest.mock('../hooks/use_data_fields');

const mockHttp = httpServiceMock.createStartContract();
const mockDataViews = dataViewPluginMocks.createStartContract();

describe('TimeFieldSelect', () => {
  const defaultServices = {
    http: mockHttp,
    dataViews: mockDataViews,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useDataFieldsModule.useDataFields).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isFetching: false,
      refetch: jest.fn(),
    });
  });

  it('renders the time field label', () => {
    render(<TimeFieldSelect services={defaultServices} />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Time Field')).toBeInTheDocument();
  });

  it('renders a select input', () => {
    render(<TimeFieldSelect services={defaultServices} />, { wrapper: createFormWrapper() });

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders aria-label for accessibility', () => {
    render(<TimeFieldSelect services={defaultServices} />, { wrapper: createFormWrapper() });

    expect(screen.getByLabelText('Select time field for rule execution')).toBeInTheDocument();
  });

  it('shows loading state when fetching fields', () => {
    jest.mocked(useDataFieldsModule.useDataFields).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isSuccess: false,
      isFetching: true,
      refetch: jest.fn(),
    });

    render(<TimeFieldSelect services={defaultServices} />, { wrapper: createFormWrapper() });

    // EuiSelect shows loading spinner, check the select is in the document
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays initial time field value when options are available', () => {
    // Mock data with the timestamp field available
    jest.mocked(useDataFieldsModule.useDataFields).mockReturnValue({
      data: {
        '@timestamp': { name: '@timestamp', type: 'date' },
      } as any,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isFetching: false,
      refetch: jest.fn(),
    });

    render(<TimeFieldSelect services={defaultServices} />, {
      wrapper: createFormWrapper({
        timeField: '@timestamp',
      }),
    });

    expect(screen.getByRole('combobox')).toHaveValue('@timestamp');
  });

  it('updates value when user selects a different option', async () => {
    const user = userEvent.setup();

    // Mock to return data with date fields - options are derived via useMemo
    jest.mocked(useDataFieldsModule.useDataFields).mockReturnValue({
      data: {
        '@timestamp': { name: '@timestamp', type: 'date' },
        event_time: { name: 'event_time', type: 'date' },
      } as any,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      isFetching: false,
      refetch: jest.fn(),
    });

    render(<TimeFieldSelect services={defaultServices} />, {
      wrapper: createFormWrapper({
        timeField: '@timestamp',
      }),
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'event_time');

    expect(select).toHaveValue('event_time');
  });

  it('passes query to useDataFields hook', () => {
    render(<TimeFieldSelect services={defaultServices} />, {
      wrapper: createFormWrapper({
        evaluation: {
          query: {
            base: 'FROM logs-*',
          },
        },
      }),
    });

    expect(useDataFieldsModule.useDataFields).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM logs-*',
        http: mockHttp,
        dataViews: mockDataViews,
      })
    );
  });
});
