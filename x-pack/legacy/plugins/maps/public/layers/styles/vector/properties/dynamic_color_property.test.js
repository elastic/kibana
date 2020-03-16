/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

describe('get mapbox color expression', () => {
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
          field: {
            name: 'myField',
          },
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return mapbox expression for color ramp', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          field: {
            name: 'myField',
          },
          color: 'Blues',
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toEqual([
          'interpolate',
          ['linear'],
          ['coalesce', ['feature-state', '__kbn__dynamic__myField__lineColor'], -1],
          -1,
          'rgba(0,0,0,0)',
          0,
          '#f7faff',
          0.125,
          '#ddeaf7',
          0.25,
          '#c5daee',
          0.375,
          '#9dc9e0',
          0.5,
          '#6aadd5',
          0.625,
          '#4191c5',
          0.75,
          '#2070b4',
          0.875,
          '#072f6b',
        ]);
      });
    });

    describe('custom color ramp', () => {
      test('should return null when customColorRamp is not provided', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          field: {
            name: 'myField',
          },
          useCustomColorRamp: true,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return null when customColorRamp is empty', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          field: {
            name: 'myField',
          },
          useCustomColorRamp: true,
          customColorRamp: [],
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return mapbox expression for custom color ramp', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          field: {
            name: 'myField',
          },
          useCustomColorRamp: true,
          customColorRamp: [
            { stop: 10, color: '#f7faff' },
            { stop: 100, color: '#072f6b' },
          ],
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toEqual([
          'step',
          ['coalesce', ['feature-state', '__kbn__dynamic__myField__lineColor'], 9],
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
      const colorProperty = makeProperty(dynamicStyleOptions, getCategoricalFieldMeta);
      expect(colorProperty._getMbColor()).toBeNull();
    });

    test('should return null when field name is not provided', async () => {
      const dynamicStyleOptions = {
        type: COLOR_MAP_TYPE.CATEGORICAL,
        field: {},
      };
      const colorProperty = makeProperty(dynamicStyleOptions, getCategoricalFieldMeta);
      expect(colorProperty._getMbColor()).toBeNull();
    });

    describe('pre-defined color palette', () => {
      test('should return null when color palette is not provided', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.CATEGORICAL,
          field: {
            name: 'myField',
          },
        };
        const colorProperty = makeProperty(dynamicStyleOptions, getCategoricalFieldMeta);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return mapbox expression for color palette', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.CATEGORICAL,
          field: {
            name: 'myField',
          },
          colorCategory: 'palette_0',
        };
        const colorProperty = makeProperty(dynamicStyleOptions, getCategoricalFieldMeta);
        expect(colorProperty._getMbColor()).toEqual([
          'match',
          ['to-string', ['get', 'myField']],
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
          field: {
            name: 'myField',
          },
          useCustomColorPalette: true,
        };
        const colorProperty = makeProperty(dynamicStyleOptions, getCategoricalFieldMeta);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return null when customColorPalette is empty', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.CATEGORICAL,
          field: {
            name: 'myField',
          },
          useCustomColorPalette: true,
          customColorPalette: [],
        };
        const colorProperty = makeProperty(dynamicStyleOptions, getCategoricalFieldMeta);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return mapbox expression for custom color palette', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.CATEGORICAL,
          field: {
            name: 'myField',
          },
          useCustomColorPalette: true,
          customColorPalette: [
            { stop: null, color: '#f7faff' },
            { stop: 'MX', color: '#072f6b' },
          ],
        };
        const colorProperty = makeProperty(dynamicStyleOptions, getCategoricalFieldMeta);
        expect(colorProperty._getMbColor()).toEqual([
          'match',
          ['to-string', ['get', 'myField']],
          'MX',
          '#072f6b',
          '#f7faff',
        ]);
      });
    });
  });
});
