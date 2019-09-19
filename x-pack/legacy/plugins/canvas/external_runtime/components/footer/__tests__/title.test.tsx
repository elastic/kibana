/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { TestingContext } from '../../../test';
import { Title } from '../title.container';

describe('<Title />', () => {
  test('null workpad renders nothing', () => {
    expect(mount(<Title />).isEmptyRender());
  });

  const wrapper = mount(
    <TestingContext>
      <Title />
    </TestingContext>
  );

  test('renders as expected', () => {
    expect(wrapper.text()).toEqual('My Canvas Workpad');
  });
});
