/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { fireEvent, waitFor, screen } from '@testing-library/react';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';
import { MaintenanceWindowsList } from './maintenance_windows_list';
import { MaintenanceWindowStatus, MaintenanceWindow } from '../../../../common';

describe('MaintenanceWindowsList', () => {
  const date = moment('2023-04-05').toISOString();
  const endDate = moment('2023-04-05').add(1, 'month').toISOString();
  const items: MaintenanceWindow[] = [
    {
      id: '1',
      title: 'Host maintenance',
      enabled: true,
      duration: 1,
      expirationDate: date,
      events: [],
      rRule: { dtstart: date, tzid: 'UTC' },
      status: MaintenanceWindowStatus.Running,
      eventStartTime: date,
      eventEndTime: endDate,
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: date,
      updatedAt: date,
    },
    {
      id: '2',
      title: 'Server outage west coast',
      enabled: true,
      duration: 1,
      expirationDate: date,
      events: [],
      rRule: { dtstart: date, tzid: 'UTC' },
      status: MaintenanceWindowStatus.Upcoming,
      eventStartTime: date,
      eventEndTime: endDate,
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: date,
      updatedAt: date,
    },
    {
      id: '4',
      title: 'Monthly maintenance window',
      enabled: true,
      duration: 1,
      expirationDate: date,
      events: [],
      rRule: { dtstart: date, tzid: 'UTC' },
      status: MaintenanceWindowStatus.Finished,
      eventStartTime: date,
      eventEndTime: endDate,
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: date,
      updatedAt: date,
    },
    {
      id: '5',
      title: 'Monthly maintenance window',
      enabled: true,
      duration: 1,
      expirationDate: date,
      events: [],
      rRule: { dtstart: date, tzid: 'UTC' },
      status: MaintenanceWindowStatus.Archived,
      eventStartTime: date,
      eventEndTime: endDate,
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: date,
      updatedAt: date,
    },
  ];
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <MaintenanceWindowsList
        refreshData={() => {}}
        isLoading={false}
        items={items}
        readOnly={false}
        page={1}
        perPage={10}
        total={22}
        onPageChange={() => {}}
        onStatusChange={() => {}}
        selectedStatus={[]}
        onSearchChange={() => {}}
      />
    );

    expect(screen.getAllByTestId('list-item')).toHaveLength(items.length);

    // check the title
    expect(screen.getAllByText('Host maintenance')).toHaveLength(1);
    expect(screen.getAllByText('Server outage west coast')).toHaveLength(1);
    expect(screen.getAllByText('Monthly maintenance window')).toHaveLength(2);

    // check the status
    expect(screen.getAllByText('Running')).toHaveLength(1);
    expect(screen.getAllByText('Upcoming')).toHaveLength(1);
    expect(screen.getAllByText('Finished')).toHaveLength(1);
    expect(screen.getAllByText('Archived')).toHaveLength(1);

    // check the startDate formatting
    expect(screen.getAllByText('04/05/23 12:00 AM')).toHaveLength(4);

    // check the endDate formatting
    expect(screen.getAllByText('05/05/23 12:00 AM')).toHaveLength(4);

    // check if action menu is there
    expect(screen.getAllByTestId('table-actions-icon-button')).toHaveLength(items.length);
  });

  test('it does NOT render action column in readonly', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <MaintenanceWindowsList
        refreshData={() => {}}
        isLoading={false}
        items={items}
        readOnly={true}
        page={1}
        perPage={10}
        total={22}
        onPageChange={() => {}}
        onStatusChange={() => {}}
        selectedStatus={[]}
        onSearchChange={() => {}}
      />
    );

    expect(screen.getAllByTestId('list-item')).toHaveLength(items.length);

    // check if action menu is there
    expect(screen.queryByTestId('table-actions-icon-button')).not.toBeInTheDocument();
  });

  test('it calls refreshData when user presses refresh button', async () => {
    appMockRenderer = createAppMockRenderer();
    const refreshData = jest.fn();
    appMockRenderer.render(
      <MaintenanceWindowsList
        refreshData={refreshData}
        isLoading={false}
        items={items}
        readOnly={false}
        page={1}
        perPage={10}
        total={22}
        onPageChange={() => {}}
        onStatusChange={() => {}}
        selectedStatus={[]}
        onSearchChange={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId('refresh-button'));
    await waitFor(() => expect(refreshData).toBeCalled());
  });
});
