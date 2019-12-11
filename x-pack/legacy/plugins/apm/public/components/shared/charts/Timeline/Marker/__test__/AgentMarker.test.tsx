/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { AgentMarker } from '../AgentMarker';

describe('AgentMarker', () => {
  const mark = {
    name: 'foo',
    us: 10000
  };
  it('renders', () => {
    const component = shallow(<AgentMarker mark={mark} />);
    expect(component).toMatchSnapshot();
  });
});
