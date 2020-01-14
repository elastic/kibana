/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { renderWithIntl } from 'test_utils/enzyme_helpers';
import { MonitorLocation } from '../../../../../common/runtime_types/monitor';
import { LocationStatusTags } from '../';

// Failing: https://github.com/elastic/kibana/issues/54672
describe.skip('StatusByLocation component', () => {
  let monitorLocations: MonitorLocation[];

  const start = moment('2020-01-10T12:22:32.567Z');
  beforeAll(() => {
    moment.prototype.fromNow = jest.fn((date: string) => start.from(date));
  });

  it('renders when there are many location', () => {
    monitorLocations = [
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'Islamabad', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: '2020-01-09T12:22:32.567Z',
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: '2020-01-09T12:22:28.825Z',
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'st-paul', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: '2020-01-09T12:22:31.586Z',
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'Tokya', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: '2020-01-09T12:22:25.771Z',
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'New York', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: '2020-01-09T12:22:27.485Z',
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'Toronto', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: '2020-01-09T12:22:28.815Z',
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'Sydney', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: '2020-01-09T12:22:32.132Z',
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'Paris', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: '2020-01-09T12:22:32.973Z',
      },
    ];
    const component = renderWithIntl(<LocationStatusTags locations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });

  it('renders when all locations are up', () => {
    monitorLocations = [
      {
        summary: { up: 4, down: 0 },
        geo: { name: 'Islamabad', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: '2020-01-09T12:22:32.567Z',
      },
      {
        summary: { up: 4, down: 0 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: '2020-01-08T12:22:28.825Z',
      },
    ];
    const component = renderWithIntl(<LocationStatusTags locations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });

  it('renders when all locations are down', () => {
    monitorLocations = [
      {
        summary: { up: 0, down: 2 },
        geo: { name: 'Islamabad', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: '2020-01-06T12:22:32.567Z',
      },
      {
        summary: { up: 0, down: 2 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: '2020-01-09T12:22:28.825Z',
      },
    ];
    const component = renderWithIntl(<LocationStatusTags locations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });
});
