/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line no-unused-vars
import React from 'react';
import { shallow } from 'enzyme';

import { VECTOR_STYLES } from '../vector_style_defaults';
import { DynamicColorProperty } from './dynamic_color_property';

const mockField = {
  async getLabel() {
    return 'foobar_label';
  },

  getName() {
    return 'foobar';
  },
  supportsFieldMeta() {
    return true;
  },
};

test('Should render ranged legend', async () => {
  const colorStyle = new DynamicColorProperty(
    {
      color: 'Blues',
    },
    VECTOR_STYLES.LINE_COLOR,
    mockField,
    () => {
      return { min: 0, max: 100 };
    },
    () => {
      return x => x + '_format';
    }
  );

  const legendRow = colorStyle.renderLegendDetailRow({
    loadIsPointsOnly: () => {
      return true;
    },
    loadIsLinesOnly: () => {
      return false;
    },
  });

  const component = shallow(legendRow);

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});

test('Should render categorical legend', async () => {
  const colorStyle = new DynamicColorProperty(
    {
      useCustomColorRamp: true,
      customColorRamp: [
        {
          stop: 0,
          color: '#FF0000',
        },
        {
          stop: 10,
          color: '#00FF00',
        },
      ],
    },
    VECTOR_STYLES.LINE_COLOR,
    mockField,
    () => {
      return { min: 0, max: 100 };
    },
    () => {
      return x => x + '_format';
    }
  );

  const legendRow = colorStyle.renderLegendDetailRow({
    loadIsPointsOnly: () => {
      return true;
    },
    loadIsLinesOnly: () => {
      return false;
    },
  });

  const component = shallow(legendRow);

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});
