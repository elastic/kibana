/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import 'jest';
import { MonitorSummary, Check } from '../../../../../../common/graphql/types';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { MonitorListDrawerComponent } from '../monitor_list_drawer';

describe('MonitorListDrawer component', () => {
  let summary: MonitorSummary;
  let loadMonitorDetails: any;
  let monitorDetails: any;

  beforeEach(() => {
    summary = {
      monitor_id: 'foo',
      state: {
        checks: [
          {
            monitor: {
              ip: '127.0.0.1',
              status: 'up',
            },
            timestamp: '121',
          },
        ],
        summary: {
          up: 1,
          down: 0,
        },
        timestamp: '123',
        url: {
          domain: 'expired.badssl.com',
          full: 'https://expired.badssl.com',
        },
      },
    };
    monitorDetails = {
      monitorId: 'bad-ssl',
      error: {
        type: 'io',
        message:
          'Get https://expired.badssl.com: x509: certificate has expired or is not yet valid',
      },
    };
    loadMonitorDetails = () => null;
  });

  it('renders nothing when no summary data is present', () => {
    const component = shallowWithIntl(
      <MonitorListDrawerComponent
        loadMonitorDetails={loadMonitorDetails}
        summary={summary}
        monitorDetails={monitorDetails}
      />
    );
    expect(component).toEqual({});
  });

  it('renders nothing when no check data is present', () => {
    delete summary.state.checks;
    const component = shallowWithIntl(
      <MonitorListDrawerComponent
        summary={summary}
        loadMonitorDetails={loadMonitorDetails}
        monitorDetails={monitorDetails}
      />
    );
    expect(component).toEqual({});
  });

  it('renders a MonitorListDrawer when there is only one check', () => {
    const component = shallowWithIntl(
      <MonitorListDrawerComponent
        summary={summary}
        loadMonitorDetails={loadMonitorDetails}
        monitorDetails={monitorDetails}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders a MonitorListDrawer when there are many checks', () => {
    const checks: Check[] = [
      {
        monitor: {
          ip: '127.0.0.1',
          status: 'up',
        },
        timestamp: '121',
      },
      {
        monitor: {
          ip: '127.0.0.2',
          status: 'down',
        },
        timestamp: '123',
      },
      {
        monitor: {
          ip: '127.0.0.3',
          status: 'up',
        },
        timestamp: '125',
      },
    ];
    summary.state.checks = checks;
    const component = shallowWithIntl(
      <MonitorListDrawerComponent
        summary={summary}
        loadMonitorDetails={loadMonitorDetails}
        monitorDetails={monitorDetails}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
