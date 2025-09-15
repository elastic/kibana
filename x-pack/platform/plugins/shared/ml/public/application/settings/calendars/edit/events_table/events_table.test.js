/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { fireEvent } from '@testing-library/react';

import { EventsTable } from './events_table';

jest.mock('../../../../capabilities/check_capabilities', () => ({
  usePermissionCheck: () => [true, true],
}));

const testProps = {
  canCreateCalendar: true,
  eventsList: [
    {
      calendar_id: 'test-calendar',
      description: 'test description',
      start_time: 1486656600000,
      end_time: 1486657800000,
      event_id: 'test-event-one',
    },
  ],
  onDeleteClick: jest.fn(),
  showSearchBar: false,
  showImportModal: jest.fn(),
  showNewEventModal: jest.fn(),
};

describe('EventsTable', () => {
  test('Renders events table with no search bar', () => {
    const { container } = renderWithI18n(<EventsTable {...testProps} />);

    expect(container).toMatchSnapshot();
  });

  test('Renders events table with search bar', () => {
    const showSearchBarProps = {
      ...testProps,
      showSearchBar: true,
    };

    const { container } = renderWithI18n(<EventsTable {...showSearchBarProps} />);

    expect(container).toMatchSnapshot();
  });

  test('Calls onDeleteClick when delete button is clicked', () => {
    const onDeleteClick = jest.fn();

    const { getByTestId } = renderWithI18n(
      <EventsTable {...testProps} onDeleteClick={onDeleteClick} />
    );

    const deleteButton = getByTestId('mlCalendarEventDeleteButton');

    fireEvent.click(deleteButton);

    expect(onDeleteClick).toHaveBeenCalledWith('test-event-one');
  });
});
