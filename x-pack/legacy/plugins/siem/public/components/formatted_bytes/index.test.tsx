/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { PreferenceFormattedBytesComponent } from '.';

jest.mock('../../lib/kibana');

const bytes = '2806422';

describe('PreferenceFormattedBytes', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(<PreferenceFormattedBytesComponent value={bytes} />);

    expect(wrapper).toMatchSnapshot();
  });

  test('it renders bytes supplied as a number according to the default format', () => {
    const wrapper = mount(<PreferenceFormattedBytesComponent value={+bytes} />);

    expect(wrapper.text()).toEqual('2.7MB');
  });
});
