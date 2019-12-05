/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { VectorStyleLegend } from './vector_style_legend';
import { DynamicStyleProperty } from '../../properties/dynamic_style_property';
import { vectorStyles } from '../../vector_style_defaults';

let isLinesOnly = false;
let isPolygonsOnly = false;
const range = { min: 0, max: 10, delta: 10 };
const defaultProps = {
  loadIsLinesOnly: async () => {
    return isLinesOnly;
  },
  loadIsPolygonsOnly: async () => {
    return isPolygonsOnly;
  },
  styleProperties: [
    {
      style: new DynamicStyleProperty({}, vectorStyles.FILL_COLOR),
      range,
    },
    {
      style: new DynamicStyleProperty({}, vectorStyles.LINE_COLOR),
      range,
    },
    {
      style: new DynamicStyleProperty({}, vectorStyles.LINE_WIDTH),
      range,
    },
    {
      style: new DynamicStyleProperty({}, vectorStyles.ICON_SIZE),
      range,
    },
    {
      style: new DynamicStyleProperty({}, vectorStyles.ICON_ORIENTATION),
      range,
    }
  ]
};

test('Should show all style properties when not single feature type', async () => {
  isLinesOnly = false;
  isPolygonsOnly = false;
  const component = shallow(
    <VectorStyleLegend
      {...defaultProps}
    />
  );

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});

test('Should only show line style properties when is lines only', async () => {
  isLinesOnly = true;
  isPolygonsOnly = false;
  const component = shallow(
    <VectorStyleLegend
      {...defaultProps}
    />
  );

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});

test('Should only show polygon style properties when is polygons only', async () => {
  isLinesOnly = false;
  isPolygonsOnly = true;
  const component = shallow(
    <VectorStyleLegend
      {...defaultProps}
    />
  );

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});
