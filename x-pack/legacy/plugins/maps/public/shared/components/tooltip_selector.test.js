/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { TooltipSelector } from './tooltip_selector';

const defaultProps = {
  value: [],
  onChange: (()=>{}),
  fields: []
};

describe('TooltipSelector', () => {

  test('should create eui row component', async () => {
    const component = shallowWithIntl(
      <TooltipSelector
        {...defaultProps}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });

});
