/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { VectorIcon } from './vector_icon';
import { VectorStyle } from '../../vector_style';
import { extractColorFromStyleProperty } from './extract_color_from_style_property';
import { VECTOR_STYLES } from '../../vector_style_defaults';

let isPointsOnly = false;
let isLinesOnly = false;
const styles = {
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

const defaultProps = {
  getColorForProperty: (styleProperty, isLinesOnly) => {
    if (isLinesOnly) {
      return extractColorFromStyleProperty(styles[VECTOR_STYLES.LINE_COLOR], 'grey');
    }

    if (styleProperty === VECTOR_STYLES.LINE_COLOR) {
      return extractColorFromStyleProperty(styles[VECTOR_STYLES.LINE_COLOR], 'none');
    } else if (styleProperty === VECTOR_STYLES.FILL_COLOR) {
      return extractColorFromStyleProperty(styles[VECTOR_STYLES.FILL_COLOR], 'grey');
    } else {
      //unexpected
      console.error('Cannot return color for properties other then line or fill color');
    }
  },

  loadIsPointsOnly: () => {
    return isPointsOnly;
  },
  loadIsLinesOnly: () => {
    return isLinesOnly;
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
