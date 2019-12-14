/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { VectorIcon } from './vector_icon';
import { VectorStyle } from '../../../vector_style';

let isPointsOnly = false;
let isLinesOnly = false;
const defaultProps = {
  loadIsPointsOnly: () => {
    return isPointsOnly;
  },
  loadIsLinesOnly: () => {
    return isLinesOnly;
  },
  fillColor: {
    type: VectorStyle.STYLE_TYPE.STATIC,
    options: {
      color: '#ff0000',
    },
  },
  lineColor: {
    type: VectorStyle.STYLE_TYPE.DYNAMIC,
    options: {
      color: 'Blues',
      field: {
        name: 'prop1',
      },
    },
  },
};

function configureIsLinesOnly() {
  isLinesOnly = true;
  isPointsOnly = false;
}

function configureIsPointsOnly() {
  isLinesOnly = false;
  isPointsOnly = true;
}

function configureNotLineOrPointOnly() {
  isLinesOnly = false;
  isPointsOnly = false;
}

test('Renders PolygonIcon with correct styles when not line only or not point only', async () => {
  configureNotLineOrPointOnly();
  const component = shallow(<VectorIcon {...defaultProps} />);

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});

test('Renders LineIcon with correct styles when isLineOnly', async () => {
  configureIsLinesOnly();
  const component = shallow(<VectorIcon {...defaultProps} />);

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});

test('Renders CircleIcon with correct styles when isPointOnly', async () => {
  configureIsPointsOnly();
  const component = shallow(<VectorIcon {...defaultProps} />);

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});

test('Renders SymbolIcon with correct styles when isPointOnly and symbolId provided', async () => {
  configureIsPointsOnly();
  const component = shallow(<VectorIcon {...defaultProps} symbolId="airfield-15" />);

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});
