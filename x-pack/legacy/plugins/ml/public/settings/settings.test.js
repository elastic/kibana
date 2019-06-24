/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



jest.mock('ui/chrome', () => ({
  getBasePath: jest.fn()
}));

import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { Settings } from './settings';


describe('Settings', () => {

  test('Renders settings page', () => {
    const wrapper = shallowWithIntl(
      <Settings canGetFilters={true} canGetCalendars={true}/>
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('Filter Lists button disabled if canGetFilters is false', () => {
    const wrapper = mountWithIntl(
      <Settings canGetFilters={false} canGetCalendars={true}/>
    );

    const button = wrapper.find('[data-testid="ml_filter_lists_button"]');
    const filterButton = button.find('EuiButtonEmpty');
    expect(filterButton.prop('isDisabled')).toBe(true);
  });

  test('Calendar management button disabled if canGetCalendars is false', () => {
    const wrapper = mountWithIntl(
      <Settings canGetFilters={true} canGetCalendars={false} />
    );

    const button = wrapper.find('[data-testid="ml_calendar_mng_button"]');
    const calendarButton = button.find('EuiButtonEmpty');
    expect(calendarButton.prop('isDisabled')).toBe(true);
  });

});
