/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { MonitorSummaryResult } from '../../../../../common/graphql/types';
import { MonitorListComponent } from '../monitor_list';

describe('MonitorList component', () => {
  let result: MonitorSummaryResult;

  beforeEach(() => {
    result = {
      summaries: [
        {
          monitor_id: 'foo',
          state: {
            checks: [
              {
                monitor: {
                  ip: '127.0.0.1',
                  status: 'up',
                },
                timestamp: '124',
              },
              {
                monitor: {
                  ip: '127.0.0.2',
                  status: 'down',
                },
                timestamp: '125',
              },
              {
                monitor: {
                  ip: '127.0.0.3',
                  status: 'down',
                },
                timestamp: '126',
              },
            ],
            summary: {
              up: 1,
              down: 2,
            },
            timestamp: '123',
          },
        },
        {
          monitor_id: 'bar',
          state: {
            checks: [
              {
                monitor: {
                  ip: '127.0.0.1',
                  status: 'up',
                },
                timestamp: '125',
              },
              {
                monitor: {
                  ip: '127.0.0.2',
                  status: 'up',
                },
                timestamp: '126',
              },
            ],
            summary: {
              up: 2,
              down: 0,
            },
            timestamp: '125',
          },
        },
      ],
      totalSummaryCount: {
        count: 2,
      },
    };
  });

  it('renders the monitor list', () => {
    const component = shallowWithIntl(
      <MonitorListComponent
        absoluteStartDate={123}
        absoluteEndDate={125}
        dangerColor="danger"
        data={{ monitorStates: result }}
        hasActiveFilters={false}
        loading={false}
        successColor="primary"
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('renders a no items message when no data is provided', () => {
    const component = shallowWithIntl(
      <MonitorListComponent
        absoluteStartDate={123}
        absoluteEndDate={125}
        dangerColor="danger"
        data={{}}
        hasActiveFilters={false}
        loading={false}
        successColor="primary"
      />
    );
    expect(component).toMatchSnapshot();
  });
});
