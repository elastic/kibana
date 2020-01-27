/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { Loader } from './index';

describe('rendering', () => {
  test('renders correctly', () => {
    const wrapper = shallow(
      <Loader overlay overlayBackground="#fff" size="xl">
        {'Loading'}
      </Loader>
    );
    expect(wrapper).toMatchSnapshot();
  });
});
