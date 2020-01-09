/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl } from 'test_utils/enzyme_helpers';
import { MonitorLocation } from '../../../../../common/runtime_types';
import { StatusByLocations } from '../';

describe('StatusByLocation component', () => {
  let monitorLocations: MonitorLocation[];

  beforeEach(() => {
    monitorLocations = [
      {
        summary: { up: 4, down: 0 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
      },
      {
        summary: { up: 4, down: 0 },
        geo: { name: 'st-paul', location: { lat: '52.487448', lon: ' 13.394798' } },
      },
    ];
  });

  it('renders duration in ms, not us', () => {
    const component = renderWithIntl(<StatusByLocations locations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });
});
