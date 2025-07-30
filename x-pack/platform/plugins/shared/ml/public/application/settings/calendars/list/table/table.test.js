/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { CalendarsListTable } from './table';

jest.mock('../../../../contexts/kibana/use_create_url', () => ({
  useCreateAndNavigateToManagementMlLink: jest.fn(),
}));

const calendars = [
  {
    calendar_id: 'farequote-calendar',
    job_ids: ['farequote'],
    description: 'test ',
    events: [],
  },
  {
    calendar_id: 'this-is-a-new-calendar',
    job_ids: ['test'],
    description: 'new calendar',
    events: [],
  },
];

const props = {
  calendarsList: calendars,
  canCreateCalendar: true,
  canDeleteCalendar: true,
  itemsSelected: false,
  loading: false,
  mlNodesAvailable: true,
  onDeleteClick: () => {},
  setSelectedCalendarList: () => {},
};

describe('CalendarsListTable', () => {
  test('renders the table with all calendars', () => {
    const { container } = renderWithI18n(
      <MemoryRouter>
        <CalendarsListTable {...props} />
      </MemoryRouter>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  test('New button enabled if permission available', () => {
    renderWithI18n(
      <MemoryRouter>
        <CalendarsListTable {...props} />
      </MemoryRouter>
    );

    const createButton = screen.getByTestId('mlCalendarButtonCreate');

    expect(createButton).not.toBeDisabled();
  });

  test('New button disabled if no permission available', () => {
    const disableProps = {
      ...props,
      canCreateCalendar: false,
    };

    renderWithI18n(
      <MemoryRouter>
        <CalendarsListTable {...disableProps} />
      </MemoryRouter>
    );

    const createButton = screen.getByTestId('mlCalendarButtonCreate');

    expect(createButton).toBeDisabled();
  });

  test('New button disabled if no ML nodes available', () => {
    const disableProps = {
      ...props,
      mlNodesAvailable: false,
    };

    renderWithI18n(
      <MemoryRouter>
        <CalendarsListTable {...disableProps} />
      </MemoryRouter>
    );

    const createButton = screen.getByTestId('mlCalendarButtonCreate');

    expect(createButton).toBeDisabled();
  });
});
