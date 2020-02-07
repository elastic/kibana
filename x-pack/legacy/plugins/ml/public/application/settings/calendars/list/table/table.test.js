/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { CalendarsListTable } from './table';

jest.mock('ui/chrome', () => ({
  getBasePath: jest.fn(),
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
    const wrapper = shallowWithIntl(<CalendarsListTable.WrappedComponent {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  test('New button enabled if permission available', () => {
    const wrapper = mountWithIntl(<CalendarsListTable.WrappedComponent {...props} />);

    const buttons = wrapper.find('[data-test-subj="mlCalendarButtonCreate"]');
    const button = buttons.find('EuiButton');

    expect(button.prop('isDisabled')).toEqual(false);
  });

  test('New button disabled if no permission available', () => {
    const disableProps = {
      ...props,
      canCreateCalendar: false,
    };

    const wrapper = mountWithIntl(<CalendarsListTable.WrappedComponent {...disableProps} />);

    const buttons = wrapper.find('[data-test-subj="mlCalendarButtonCreate"]');
    const button = buttons.find('EuiButton');

    expect(button.prop('isDisabled')).toEqual(true);
  });

  test('New button disabled if no ML nodes available', () => {
    const disableProps = {
      ...props,
      mlNodesAvailable: false,
    };

    const wrapper = mountWithIntl(<CalendarsListTable.WrappedComponent {...disableProps} />);

    const buttons = wrapper.find('[data-test-subj="mlCalendarButtonCreate"]');
    const button = buttons.find('EuiButton');

    expect(button.prop('isDisabled')).toEqual(true);
  });
});
