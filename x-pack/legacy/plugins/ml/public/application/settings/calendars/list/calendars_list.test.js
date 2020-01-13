/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { ml } from '../../../services/ml_api_service';

import { CalendarsList } from './calendars_list';

jest.mock('../../../components/navigation_menu', () => ({
  NavigationMenu: () => <div id="mockNavigationMenu" />,
}));
jest.mock('../../../privilege/check_privilege', () => ({
  checkPermission: () => true,
}));
jest.mock('../../../license/check_license', () => ({
  hasLicenseExpired: () => false,
  isFullLicense: () => false,
}));
jest.mock('../../../privilege/get_privileges', () => ({
  getPrivileges: () => {},
}));
jest.mock('../../../ml_nodes_check/check_ml_nodes', () => ({
  mlNodesAvailable: () => true,
}));
jest.mock('../../../services/ml_api_service', () => ({
  ml: {
    calendars: () => {
      return Promise.resolve([]);
    },
    delete: jest.fn(),
  },
}));

const testingState = {
  loading: false,
  calendars: [
    {
      calendar_id: 'farequote-calendar',
      job_ids: ['farequote'],
      description: 'test ',
      events: [
        {
          description: 'Downtime feb 9 2017 10:10 to 10:30',
          start_time: 1486656600000,
          end_time: 1486657800000,
          calendar_id: 'farequote-calendar',
          event_id: 'Ee-YgGcBxHgQWEhCO_xj',
        },
      ],
    },
    {
      calendar_id: 'this-is-a-new-calendar',
      job_ids: ['test'],
      description: 'new calendar',
      events: [
        {
          description: 'New event!',
          start_time: 1544076000000,
          end_time: 1544162400000,
          calendar_id: 'this-is-a-new-calendar',
          event_id: 'ehWKhGcBqHkXuWNrIrSV',
        },
      ],
    },
  ],
  isDestroyModalVisible: false,
  calendarId: null,
  selectedForDeletion: [],
  nodesAvailable: true,
};

const props = {
  canCreateCalendar: true,
  canDeleteCalendar: true,
};

describe('CalendarsList', () => {
  test('loads calendars on mount', () => {
    ml.calendars = jest.fn(() => []);
    shallowWithIntl(<CalendarsList.WrappedComponent {...props} />);

    expect(ml.calendars).toHaveBeenCalled();
  });

  test('Renders calendar list with calendars', () => {
    const wrapper = shallowWithIntl(<CalendarsList.WrappedComponent {...props} />);

    wrapper.instance().setState(testingState);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
  });

  test('Sets selected calendars list on checkbox change', () => {
    const wrapper = mountWithIntl(<CalendarsList.WrappedComponent {...props} />);

    const instance = wrapper.instance();
    const spy = jest.spyOn(instance, 'setSelectedCalendarList');
    instance.setState(testingState);
    wrapper.update();

    const checkbox = wrapper.find('input[type="checkbox"]').first();
    checkbox.simulate('change');
    expect(spy).toHaveBeenCalled();
  });
});
