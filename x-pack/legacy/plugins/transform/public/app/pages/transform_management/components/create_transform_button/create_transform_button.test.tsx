/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { CreateTransformButton } from './create_transform_button';

describe('Data Frame: Transform List <CreateTransformButton />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(<CreateTransformButton />);

    expect(wrapper).toMatchSnapshot();
  });
});
