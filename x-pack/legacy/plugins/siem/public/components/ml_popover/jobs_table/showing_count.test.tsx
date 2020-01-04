/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import * as React from 'react';
import { ShowingCountComponent } from './showing_count';

describe('ShowingCount', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(<ShowingCountComponent filterResultsLength={2} />);
    expect(wrapper).toMatchSnapshot();
  });
});
