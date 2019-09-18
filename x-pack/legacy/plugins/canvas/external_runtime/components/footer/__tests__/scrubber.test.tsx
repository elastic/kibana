/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { Context } from '../../../context/mock';
import { Scrubber } from '../scrubber.container';

describe('<Scrubber />', () => {
  test('null workpad renders nothing', () => {
    expect(mount(<Scrubber />).isEmptyRender());
  });

  const wrapper = mount(
    <Context>
      <Scrubber />
    </Context>
  );

  const container = () => wrapper.find('.slideContainer');
  const markdown = () => wrapper.find('.render');

  test('renders as expected', () => {
    expect(container().children().length === 1);
    expect(markdown().text()).toEqual('markdown mock');
  });
});
