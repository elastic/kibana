/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { LocationMap } from '../location_map';
import { MonitorLocations } from '../../../../../common/runtime_types';
import { LocationMissingWarning } from '../location_missing';

// Note For shallow test, we need absolute time strings
describe('LocationMap component', () => {
  let monitorLocations: MonitorLocations;

  beforeEach(() => {
    monitorLocations = {
      monitorId: 'wapo',
      locations: [
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'New York', location: { lat: '40.730610', lon: ' -73.935242' } },
          timestamp: '2020-01-13T22:50:06.536Z',
        },
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'Tokyo', location: { lat: '52.487448', lon: ' 13.394798' } },
          timestamp: '2020-01-13T22:50:04.354Z',
        },
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'Unnamed-location' },
          timestamp: '2020-01-13T22:50:02.753Z',
        },
      ],
    };
  });

  it('renders correctly against snapshot', () => {
    const component = shallowWithIntl(<LocationMap monitorLocations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });

  it('shows warning if geo information is missing', () => {
    monitorLocations = {
      monitorId: 'wapo',
      locations: [
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'Tokyo', location: { lat: '52.487448', lon: ' 13.394798' } },
          timestamp: '2020-01-13T22:50:04.354Z',
        },
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'Unnamed-location' },
          timestamp: '2020-01-13T22:50:02.753Z',
        },
      ],
    };
    const component = shallowWithIntl(<LocationMap monitorLocations={monitorLocations} />);
    expect(component).toMatchSnapshot();

    const warningComponent = component.find(LocationMissingWarning);
    expect(warningComponent).toHaveLength(1);
  });

  it('doesnt shows warning if geo is provided', () => {
    monitorLocations = {
      monitorId: 'wapo',
      locations: [
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'New York', location: { lat: '40.730610', lon: ' -73.935242' } },
          timestamp: '2020-01-13T22:50:06.536Z',
        },
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'Tokyo', location: { lat: '52.487448', lon: ' 13.394798' } },
          timestamp: '2020-01-13T22:50:04.354Z',
        },
      ],
    };
    const component = shallowWithIntl(<LocationMap monitorLocations={monitorLocations} />);
    expect(component).toMatchSnapshot();

    const warningComponent = component.find(LocationMissingWarning);
    expect(warningComponent).toHaveLength(0);
  });

  it('renders named locations that have missing geo data', () => {
    monitorLocations = {
      monitorId: 'wapo',
      locations: [
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'New York', location: undefined },
          timestamp: '2020-01-13T22:50:06.536Z',
        },
      ],
    };

    const component = shallowWithIntl(<LocationMap monitorLocations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });
});
