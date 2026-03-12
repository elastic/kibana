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
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { TimeFieldSelect } from './time_field_select';
import { createFormWrapper } from '../../test_utils';
import * as useDataFieldsModule from '../hooks/use_data_fields';
import { applicationServiceMock } from '@kbn/core/public/mocks';

jest.mock('../hooks/use_data_fields');

const mockHttp = httpServiceMock.createStartContract();
const mockDataViews = dataViewPluginMocks.createStartContract();
const mockData = dataPluginMock.createStartContract();
const mockNotifications = notificationServiceMock.createStartContract();
const mockApplication = applicationServiceMock.createStartContract();

const mockServices = {
  http: mockHttp,
  data: mockData,
  dataViews: mockDataViews,
  notifications: mockNotifications,
  application: mockApplication,
};

describe('TimeFieldSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useDataFieldsModule.useDataFields).mockReturnValue({
      data: {},
      isLoading: false,
    } as unknown as ReturnType<typeof useDataFieldsModule.useDataFields>);
  });

  it('renders the time field label', () => {
    render(<TimeFieldSelect />, { wrapper: createFormWrapper({}, mockServices) });

    expect(screen.getByText('Time Field')).toBeInTheDocument();
  });

  it('renders a select input', () => {
    render(<TimeFieldSelect />, { wrapper: createFormWrapper({}, mockServices) });

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders aria-label for accessibility', () => {
    render(<TimeFieldSelect />, { wrapper: createFormWrapper({}, mockServices) });

    expect(screen.getByLabelText('Select time field for rule execution')).toBeInTheDocument();
  });

  it('shows loading state when fetching fields', () => {
    jest.mocked(useDataFieldsModule.useDataFields).mockReturnValue({
      data: {},
      isLoading: true,
    } as unknown as ReturnType<typeof useDataFieldsModule.useDataFields>);

    render(<TimeFieldSelect />, { wrapper: createFormWrapper({}, mockServices) });

    // EuiSelect shows loading spinner, check the select is in the document
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays initial time field value when options are available', () => {
    // Mock data with the timestamp field available
    jest.mocked(useDataFieldsModule.useDataFields).mockReturnValue({
      data: {
        '@timestamp': { name: '@timestamp', type: 'date' },
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useDataFieldsModule.useDataFields>);

    render(<TimeFieldSelect />, {
      wrapper: createFormWrapper(
        {
          timeField: '@timestamp',
        },
        mockServices
      ),
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
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useDataFieldsModule.useDataFields>);

    render(<TimeFieldSelect />, {
      wrapper: createFormWrapper(
        {
          timeField: '@timestamp',
        },
        mockServices
      ),
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'event_time');

    expect(select).toHaveValue('event_time');
  });

  it('passes query to useDataFields hook', () => {
    render(<TimeFieldSelect />, {
      wrapper: createFormWrapper(
        {
          evaluation: {
            query: {
              base: 'FROM logs-*',
            },
          },
        },
        mockServices
      ),
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
