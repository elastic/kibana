/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { MonitorListStatusColumn } from '../monitor_list_status_column';

describe('MonitorListStatusColumn', () => {
  beforeAll(() => {
    moment.prototype.toLocaleString = jest.fn(() => 'Thu May 09 2019 10:15:11 GMT-0400');
    moment.prototype.fromNow = jest.fn(() => 'a few seconds ago');
    // Only for testing purposes we allow extending Date here
    // eslint-disable-next-line no-extend-native
    Date.prototype.toString = jest.fn(() => 'Tue, 01 Jan 2019 00:00:00 GMT');
  });

  it('provides expected tooltip and display times', () => {
    const component = shallowWithIntl(<MonitorListStatusColumn status="up" timestamp="2314123" />);
    expect(component).toMatchSnapshot();
  });

  it('can handle a non-numeric timestamp value', () => {
    const component = shallowWithIntl(
      <MonitorListStatusColumn status="up" timestamp={new Date().toString()} />
    );
    expect(component).toMatchSnapshot();
  });
});
