/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Marker } from '../';

describe('Marker', () => {
  it('returns null when mark is empty', () => {
    const component = shallow(<Marker mark={{}} x={10} />);
    expect(component.isEmptyRender()).toBeTruthy();
  });

  it('renders agent marker', () => {
    const mark = {
      name: 'agent',
      us: 1000,
      type: 'AGENT'
    };
    const component = shallow(<Marker mark={mark} x={10} />);
    expect(component).toMatchSnapshot();
  });

  it('renders error marker', () => {
    const mark = {
      name: 'error',
      us: 5000,
      type: 'ERROR'
    };
    const component = shallow(<Marker mark={mark} x={10} />);
    expect(component).toMatchSnapshot();
  });
});
