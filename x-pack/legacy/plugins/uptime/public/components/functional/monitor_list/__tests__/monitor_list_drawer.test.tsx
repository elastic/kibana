/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorSummary, Check } from '../../../../../common/graphql/types';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { MonitorListDrawer } from '../monitor_list_drawer';

describe('MonitorListDrawer component', () => {
  let summary: MonitorSummary;

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
      },
    };
  });

  it('renders nothing when no summary data is present', () => {
    const component = shallowWithIntl(
      <MonitorListDrawer condensedCheckLimit={12} dangerColor="danger" successColor="success" />
    );
    expect(component).toEqual({});
  });

  it('renders nothing when no check data is present', () => {
    delete summary.state.checks;
    const component = shallowWithIntl(
      <MonitorListDrawer
        condensedCheckLimit={12}
        dangerColor="danger"
        successColor="success"
        summary={summary}
      />
    );
    expect(component).toEqual({});
  });

  it('renders a Checklist when there is only one check', () => {
    const component = shallowWithIntl(
      <MonitorListDrawer
        condensedCheckLimit={12}
        dangerColor="danger"
        successColor="success"
        summary={summary}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders a CondensedCheckList when there are many checks', () => {
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
      <MonitorListDrawer
        condensedCheckLimit={3}
        dangerColor="danger"
        successColor="success"
        summary={summary}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
