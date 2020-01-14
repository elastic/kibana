/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { EmbeddedMap, LocationPoint } from '../embedded_map';

describe('Embeddable', () => {
  it.skip('renders', () => {
    const upPoints: LocationPoint[] = [
      { lat: '40.730610', lon: ' -73.935242' },
      { lat: '52.487448', lon: ' 13.394798' },
    ];
    const downPoints: LocationPoint[] = [];
    const wrapper = shallowWithIntl(<EmbeddedMap downPoints={downPoints} upPoints={upPoints} />);

    expect(wrapper).toMatchSnapshot();
  });
});
