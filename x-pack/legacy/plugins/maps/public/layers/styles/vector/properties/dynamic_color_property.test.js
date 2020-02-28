/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('ui/new_platform');
jest.mock('../components/vector_style_editor', () => ({
  VectorStyleEditor: () => {
    return <div>mockVectorStyleEditor</div>;
  },
}));

import React from 'react';
import { shallow } from 'enzyme';

import { VECTOR_STYLES } from '../vector_style_defaults';
import { DynamicColorProperty } from './dynamic_color_property';
import { COLOR_MAP_TYPE } from '../../../../../common/constants';

const mockField = {
  async getLabel() {
    return 'foobar_label';
  },
  getName() {
    return 'foobar';
  },
  getRootName() {
    return 'foobar';
  },
  supportsFieldMeta() {
    return true;
  },
};

const getOrdinalFieldMeta = () => {
  return { min: 0, max: 100 };
};

const getCategoricalFieldMeta = () => {
  return {
    categories: [
      {
        key: 'US',
        count: 10,
      },
      {
        key: 'CN',
        count: 8,
      },
    ],
  };
};
const makeProperty = (options, getFieldMeta) => {
  return new DynamicColorProperty(
    options,
    VECTOR_STYLES.LINE_COLOR,
    mockField,
    getFieldMeta,
    () => {
      return x => x + '_format';
    }
  );
};

const defaultLegendParams = {
  isPointsOnly: true,
  isLinesOnly: false,
};

test('Should render ordinal legend', async () => {
  const colorStyle = makeProperty(
    {
      color: 'Blues',
      type: undefined,
    },
    getOrdinalFieldMeta
  );

  const legendRow = colorStyle.renderLegendDetailRow(defaultLegendParams);

  const component = shallow(legendRow);

  expect(component).toMatchSnapshot();
});

test('Should render ordinal legend with breaks', async () => {
  const colorStyle = makeProperty(
    {
      type: COLOR_MAP_TYPE.ORDINAL,
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
    getOrdinalFieldMeta
  );

  const legendRow = colorStyle.renderLegendDetailRow(defaultLegendParams);

  const component = shallow(legendRow);

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});

test('Should render categorical legend with breaks from default', async () => {
  const colorStyle = makeProperty(
    {
      type: COLOR_MAP_TYPE.CATEGORICAL,
      useCustomColorPalette: false,
      colorCategory: 'palette_0',
    },
    getCategoricalFieldMeta
  );

  const legendRow = colorStyle.renderLegendDetailRow(defaultLegendParams);

  const component = shallow(legendRow);

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});

test('Should render categorical legend with breaks from custom', async () => {
  const colorStyle = makeProperty(
    {
      type: COLOR_MAP_TYPE.CATEGORICAL,
      useCustomColorPalette: true,
      customColorPalette: [
        {
          stop: null, //should include the default stop
          color: '#FFFF00',
        },
        {
          stop: 'US_STOP',
          color: '#FF0000',
        },
        {
          stop: 'CN_STOP',
          color: '#00FF00',
        },
      ],
    },
    getCategoricalFieldMeta
  );

  const legendRow = colorStyle.renderLegendDetailRow(defaultLegendParams);

  const component = shallow(legendRow);

  expect(component).toMatchSnapshot();
});

function makeFeatures(foobarPropValues) {
  return foobarPropValues.map(value => {
    return {
      type: 'Feature',
      properties: {
        foobar: value,
      },
    };
  });
}

test('Should pluck the categorical style-meta', async () => {
  const colorStyle = makeProperty({
    type: COLOR_MAP_TYPE.CATEGORICAL,
    colorCategory: 'palette_0',
    getCategoricalFieldMeta,
  });

  const features = makeFeatures(['CN', 'CN', 'US', 'CN', 'US', 'IN']);
  const meta = colorStyle.pluckStyleMetaFromFeatures(features);

  expect(meta).toEqual({
    categories: [
      { key: 'CN', count: 3 },
      { key: 'US', count: 2 },
      { key: 'IN', count: 1 },
    ],
  });
});

test('Should pluck the categorical style-meta from fieldmeta', async () => {
  const colorStyle = makeProperty({
    type: COLOR_MAP_TYPE.CATEGORICAL,
    colorCategory: 'palette_0',
    getCategoricalFieldMeta,
  });

  const meta = colorStyle.pluckStyleMetaFromFieldMetaData({
    foobar: {
      buckets: [
        {
          key: 'CN',
          doc_count: 3,
        },
        { key: 'US', doc_count: 2 },
        { key: 'IN', doc_count: 1 },
      ],
    },
  });

  expect(meta).toEqual({
    categories: [
      { key: 'CN', count: 3 },
      { key: 'US', count: 2 },
      { key: 'IN', count: 1 },
    ],
  });
});
