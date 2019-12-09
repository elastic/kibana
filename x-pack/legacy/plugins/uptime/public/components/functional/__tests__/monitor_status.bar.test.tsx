/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React from 'react';
import { renderWithIntl } from 'test_utils/enzyme_helpers';
import { Ping } from '../../../../common/graphql/types';
import { MonitorStatusBarComponent } from '../monitor_status_bar';

describe('MonitorStatusBar component', () => {
  let monitorStatus: Ping[];

  beforeEach(() => {
    monitorStatus = [
      {
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
      },
    ];
  });

  it('renders duration in ms, not us', () => {
    const component = renderWithIntl(
      <MonitorStatusBarComponent loading={false} data={{ monitorStatus }} monitorId="foo" />
    );
    expect(component).toMatchSnapshot();
  });
});
