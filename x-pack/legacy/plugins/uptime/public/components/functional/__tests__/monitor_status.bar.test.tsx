/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React from 'react';
import { renderWithIntl } from 'test_utils/enzyme_helpers';
import { Ping } from '../../../../common/graphql/types';
import { MonitorStatusBarComponent } from '../monitor_status_details/monitor_status_bar';

describe('MonitorStatusBar component', () => {
  let monitorStatus: Ping;
  let monitorLocations: any;
  let dateStart: string;
  let dateEnd: string;

  beforeEach(() => {
    monitorStatus = {
      id: 'id1',
      timestamp: moment(new Date())
        .subtract(15, 'm')
        .toString(),
      monitor: {
        duration: {
          us: 1234567,
        },
        status: 'up',
      },
      url: {
        full: 'https://www.example.com/',
      },
    };

    monitorLocations = {
      monitorId: 'secure-avc',
      locations: [
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        },
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'st-paul', location: { lat: '52.487448', lon: ' 13.394798' } },
        },
      ],
    };

    dateStart = moment('01-01-2010').toString();
    dateEnd = moment('10-10-2010').toString();
  });

  it('renders duration in ms, not us', () => {
    const component = renderWithIntl(
      <MonitorStatusBarComponent
        monitorStatus={monitorStatus}
        monitorId="id1"
        dateStart={dateStart}
        dateEnd={dateEnd}
        monitorLocations={monitorLocations}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
