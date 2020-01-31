/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { TooltipSelector } from './tooltip_selector';

const defaultProps = {
  tooltipProperties: ['iso2'],
  onChange: () => {},
  fields: [
    {
      name: 'iso2',
      label: 'ISO 3166-1 alpha-2 code',
      type: 'string',
    },
    {
      name: 'iso3',
      type: 'string',
    },
  ],
};

describe('TooltipSelector', () => {
  test('should render component', async () => {
    const component = shallow(<TooltipSelector {...defaultProps} />);

    expect(component).toMatchSnapshot();
  });
});
