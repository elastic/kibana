/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { ValidatedRange } from './validated_range';

const MAX = 10;
const defaultProps = {
  max: MAX,
  min: 0,
  value: 3,
  onChange: () => {}
};

test('Should render slider', () => {
  const component = shallow(
    <ValidatedRange
      {...defaultProps}
    />
  );

  expect(component)
    .toMatchSnapshot();
});

test('Should pass slider props to slider', () => {
  const component = shallow(
    <ValidatedRange
      {...defaultProps}
      showLabels
      showInput
      showRange
    />
  );

  expect(component)
    .toMatchSnapshot();
});

test('Should display error message when value is outside of range', () => {
  const component = shallow(
    <ValidatedRange
      {...defaultProps}
      value={MAX + 1}
    />
  );

  expect(component)
    .toMatchSnapshot();
});
