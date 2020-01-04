/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

jest.mock('../stats', () => ({
  Stats: () => 'Stats',
}));
jest.mock('../../', () => ({
  MonitoringTimeseriesContainer: () => 'MonitoringTimeseriesContainer',
}));

import { BeatsOverview } from './overview';

describe('Overview', () => {
  test('that overview page renders normally', () => {
    const latestActive = [
      { range: 'last1m', count: 5 },
      { range: 'last5m', count: 5 },
      { range: 'last20m', count: 5 },
      { range: 'last1h', count: 6 },
      { range: 'last1d', count: 10 },
    ];
    const latestTypes = [
      { type: 'Packetbeat', count: 4 },
      { type: 'Metricbeat', count: 4 },
      { type: 'Heartbeat', count: 2 },
    ];
    const latestVersions = [
      { version: '6.3.1', count: 8 },
      { version: '6.3.0', count: 2 },
    ];
    const metrics = {
      beat_event_rates: 1,
      beat_fail_rates: 1,
      beat_throughput_rates: 1,
      beat_output_errors: 1,
    };

    const component = shallow(
      <BeatsOverview
        latestActive={latestActive}
        latestTypes={latestTypes}
        latestVersions={latestVersions}
        stats={[]}
        metrics={metrics}
      />
    );

    expect(component).toMatchSnapshot();
  });

  test('that overview page shows a message if there is no beats data', () => {
    const metrics = {
      beat_event_rates: 1,
      beat_fail_rates: 1,
      beat_throughput_rates: 1,
      beat_output_errors: 1,
    };

    const component = shallow(<BeatsOverview stats={[]} metrics={metrics} />);

    expect(component).toMatchSnapshot();
  });
});
