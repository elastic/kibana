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
import { StyleMeta } from '../style_meta';
import { COLOR_MAP_TYPE, FIELD_ORIGIN } from '../../../../../common/constants';

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
  getOrigin() {
    return FIELD_ORIGIN.SOURCE;
  },
  supportsFieldMeta() {
    return true;
  },
};

class MockStyle {
  getStyleMeta() {
    return new StyleMeta({
      geometryTypes: {
        isPointsOnly: false,
        isLinesOnly: false,
        isPolygonsOnly: false,
      },
      fieldMeta: {
        foobar: {
          range: { min: 0, max: 100 },
          categories: {
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
          },
        },
      },
    });
  }
}

class MockLayer {
  getStyle() {
    return new MockStyle();
  }

  findDataRequestById() {
    return null;
  }
}

const makeProperty = options => {
  return new DynamicColorProperty(
    options,
    VECTOR_STYLES.LINE_COLOR,
    mockField,
    new MockLayer(),
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
  const colorStyle = makeProperty({
    color: 'Blues',
    type: undefined,
  });

  const legendRow = colorStyle.renderLegendDetailRow(defaultLegendParams);

  const component = shallow(legendRow);

  expect(component).toMatchSnapshot();
});

test('Should render ordinal legend with breaks', async () => {
  const colorStyle = makeProperty({
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
  });

  const legendRow = colorStyle.renderLegendDetailRow(defaultLegendParams);

  const component = shallow(legendRow);

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});

test('Should render categorical legend with breaks from default', async () => {
  const colorStyle = makeProperty({
    type: COLOR_MAP_TYPE.CATEGORICAL,
    useCustomColorPalette: false,
    colorCategory: 'palette_0',
  });

  const legendRow = colorStyle.renderLegendDetailRow(defaultLegendParams);

  const component = shallow(legendRow);

  // Ensure all promises resolve
  await new Promise(resolve => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});

test('Should render categorical legend with breaks from custom', async () => {
  const colorStyle = makeProperty({
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
  });

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
  });

  const features = makeFeatures(['CN', 'CN', 'US', 'CN', 'US', 'IN']);
  const meta = colorStyle.pluckCategoricalStyleMetaFromFeatures(features);

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
  });

  const meta = colorStyle.pluckCategoricalStyleMetaFromFieldMetaData({
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

test('Should read out categorical type correctly', async () => {
  const categoricalColorStyle = makeProperty({
    type: COLOR_MAP_TYPE.CATEGORICAL,
    colorCategory: 'palette_0',
  });

  expect(categoricalColorStyle.isOrdinal()).toEqual(false);
  expect(categoricalColorStyle.isCategorical()).toEqual(true);
});

test('Should read out ordinal correctly when type===undefined', async () => {
  const ordinalColorStyle = makeProperty({
    type: undefined,
    color: 'Blues',
  });

  expect(ordinalColorStyle.isOrdinal()).toEqual(true);
  expect(ordinalColorStyle.isCategorical()).toEqual(false);
});

test('Should read out ordinal type correctly', async () => {
  const ordinalColorStyle2 = makeProperty({
    type: COLOR_MAP_TYPE.ORDINAL,
    colorCategory: 'palette_0',
  });

  expect(ordinalColorStyle2.isOrdinal()).toEqual(true);
  expect(ordinalColorStyle2.isCategorical()).toEqual(false);
});
