/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { TooltipSelector } from './tooltip_selector';

const defaultProps = {
  value: [],
  onChange: (()=>{}),
  fields: []
};

describe('TooltipSelector', () => {

  test('should create eui row component', async () => {
    const component = shallow(
      <TooltipSelector
        {...defaultProps}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });

});
