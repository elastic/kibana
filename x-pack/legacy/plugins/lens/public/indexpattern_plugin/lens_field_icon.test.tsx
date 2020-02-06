/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { shallow } from 'enzyme';
import { LensFieldIcon, getColorForDataType } from './lens_field_icon';

test('LensFieldIcon renders properly', () => {
  const component = shallow(<LensFieldIcon type={'date'} />);
  expect(component).toMatchSnapshot();
});

test('LensFieldIcon getColorForDataType for a valid type', () => {
  const color = getColorForDataType('date');
  expect(color).toEqual('#DA8B45');
});

test('LensFieldIcon getColorForDataType for an invalid type', () => {
  const color = getColorForDataType('invalid');
  expect(color).toEqual('#54B399');
});
