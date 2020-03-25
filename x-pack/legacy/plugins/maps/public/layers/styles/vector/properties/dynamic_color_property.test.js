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

import { DynamicColorProperty } from './dynamic_color_property';
import { StyleMeta } from '../style_meta';
import { COLOR_MAP_TYPE, FIELD_ORIGIN, VECTOR_STYLES } from '../../../../../common/constants';

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

  getDataRequest() {
    return null;
  }
}

const makeProperty = (options, field = mockField) => {
  return new DynamicColorProperty(options, VECTOR_STYLES.LINE_COLOR, field, new MockLayer(), () => {
    return x => x + '_format';
  });
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

describe('supportsFieldMeta', () => {
  test('should support it when field does for ordinals', () => {
    const dynamicStyleOptions = {
      type: COLOR_MAP_TYPE.ORDINAL,
    };
    const styleProp = makeProperty(dynamicStyleOptions);

    expect(styleProp.supportsFieldMeta()).toEqual(true);
  });

  test('should support it when field does for categories', () => {
    const dynamicStyleOptions = {
      type: COLOR_MAP_TYPE.CATEGORICAL,
    };
    const styleProp = makeProperty(dynamicStyleOptions);

    expect(styleProp.supportsFieldMeta()).toEqual(true);
  });

  test('should not support it when field does not', () => {
    const field = Object.create(mockField);
    field.supportsFieldMeta = function() {
      return false;
    };

    const dynamicStyleOptions = {
      type: COLOR_MAP_TYPE.ORDINAL,
    };
    const styleProp = makeProperty(dynamicStyleOptions, field);

    expect(styleProp.supportsFieldMeta()).toEqual(false);
  });

  test('should not support it when field config not complete', () => {
    const dynamicStyleOptions = {
      type: COLOR_MAP_TYPE.ORDINAL,
    };
    const styleProp = makeProperty(dynamicStyleOptions, null);

    expect(styleProp.supportsFieldMeta()).toEqual(false);
  });

  test('should not support it when using custom ramp for ordinals', () => {
    const dynamicStyleOptions = {
      type: COLOR_MAP_TYPE.ORDINAL,
      useCustomColorRamp: true,
      customColorRamp: [],
    };
    const styleProp = makeProperty(dynamicStyleOptions);

    expect(styleProp.supportsFieldMeta()).toEqual(false);
  });

  test('should not support it when using custom palette for categories', () => {
    const dynamicStyleOptions = {
      type: COLOR_MAP_TYPE.CATEGORICAL,
      useCustomColorPalette: true,
      customColorPalette: [],
    };
    const styleProp = makeProperty(dynamicStyleOptions);

    expect(styleProp.supportsFieldMeta()).toEqual(false);
  });
});

describe('get mapbox color expression (via internal _getMbColor)', () => {
  describe('ordinal color ramp', () => {
    test('should return null when field is not provided', async () => {
      const dynamicStyleOptions = {
        type: COLOR_MAP_TYPE.ORDINAL,
      };
      const colorProperty = makeProperty(dynamicStyleOptions);
      expect(colorProperty._getMbColor()).toBeNull();
    });

    test('should return null when field name is not provided', async () => {
      const dynamicStyleOptions = {
        type: COLOR_MAP_TYPE.ORDINAL,
        field: {},
      };
      const colorProperty = makeProperty(dynamicStyleOptions);
      expect(colorProperty._getMbColor()).toBeNull();
    });

    describe('pre-defined color ramp', () => {
      test('should return null when color ramp is not provided', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });
      test('should return mapbox expression for color ramp', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          color: 'Blues',
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toEqual([
          'interpolate',
          ['linear'],
          [
            'coalesce',
            [
              'case',
              ['==', ['feature-state', 'foobar'], null],
              -1,
              ['max', ['min', ['to-number', ['feature-state', 'foobar']], 100], 0],
            ],
            -1,
          ],
          -1,
          'rgba(0,0,0,0)',
          0,
          '#f7faff',
          12.5,
          '#ddeaf7',
          25,
          '#c5daee',
          37.5,
          '#9dc9e0',
          50,
          '#6aadd5',
          62.5,
          '#4191c5',
          75,
          '#2070b4',
          87.5,
          '#072f6b',
        ]);
      });
    });

    describe('custom color ramp', () => {
      test('should return null when customColorRamp is not provided', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          useCustomColorRamp: true,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return null when customColorRamp is empty', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          useCustomColorRamp: true,
          customColorRamp: [],
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return mapbox expression for custom color ramp', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          useCustomColorRamp: true,
          customColorRamp: [
            { stop: 10, color: '#f7faff' },
            { stop: 100, color: '#072f6b' },
          ],
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toEqual([
          'step',
          ['coalesce', ['feature-state', 'foobar'], 9],
          'rgba(0,0,0,0)',
          10,
          '#f7faff',
          100,
          '#072f6b',
        ]);
      });
    });
  });

  describe('categorical color palette', () => {
    test('should return null when field is not provided', async () => {
      const dynamicStyleOptions = {
        type: COLOR_MAP_TYPE.CATEGORICAL,
      };
      const colorProperty = makeProperty(dynamicStyleOptions);
      expect(colorProperty._getMbColor()).toBeNull();
    });

    test('should return null when field name is not provided', async () => {
      const dynamicStyleOptions = {
        type: COLOR_MAP_TYPE.CATEGORICAL,
        field: {},
      };
      const colorProperty = makeProperty(dynamicStyleOptions);
      expect(colorProperty._getMbColor()).toBeNull();
    });

    describe('pre-defined color palette', () => {
      test('should return null when color palette is not provided', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.CATEGORICAL,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return mapbox expression for color palette', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.CATEGORICAL,
          colorCategory: 'palette_0',
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toEqual([
          'match',
          ['to-string', ['get', 'foobar']],
          'US',
          '#54B399',
          'CN',
          '#6092C0',
          '#D36086',
        ]);
      });
    });

    describe('custom color palette', () => {
      test('should return null when customColorPalette is not provided', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.CATEGORICAL,
          useCustomColorPalette: true,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return null when customColorPalette is empty', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.CATEGORICAL,
          useCustomColorPalette: true,
          customColorPalette: [],
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return mapbox expression for custom color palette', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.CATEGORICAL,
          useCustomColorPalette: true,
          customColorPalette: [
            { stop: null, color: '#f7faff' },
            { stop: 'MX', color: '#072f6b' },
          ],
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toEqual([
          'match',
          ['to-string', ['get', 'foobar']],
          'MX',
          '#072f6b',
          '#f7faff',
        ]);
      });
    });
  });
});

test('isCategorical should return true when type is categorical', async () => {
  const categoricalColorStyle = makeProperty({
    type: COLOR_MAP_TYPE.CATEGORICAL,
    colorCategory: 'palette_0',
  });

  expect(categoricalColorStyle.isOrdinal()).toEqual(false);
  expect(categoricalColorStyle.isCategorical()).toEqual(true);
});

test('isOrdinal should return true when type is ordinal', async () => {
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
