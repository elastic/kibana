/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';

jest.mock('../components/vector_style_editor', () => ({
  VectorStyleEditor: () => {
    return <div>mockVectorStyleEditor</div>;
  },
}));

import React from 'react';
import type { RawValue } from '../../../../../common/constants';
import { ICON_SOURCE, VECTOR_STYLES } from '../../../../../common/constants';
// @ts-ignore
import { DynamicIconProperty } from './dynamic_icon_property';
import { mockField, MockLayer } from './test_helpers/test_util';
import type { IconDynamicOptions } from '../../../../../common/descriptor_types';
import type { IField } from '../../../fields/field';
import type { IVectorLayer } from '../../../layers/vector_layer';

const makeProperty = (options: Partial<IconDynamicOptions>, field: IField = mockField) => {
  const defaultOptions: IconDynamicOptions = {
    icon_palette_id: null,
    field_meta_options: { is_enabled: false },
  };
  const mockVectorLayer = new MockLayer() as unknown as IVectorLayer;
  return new DynamicIconProperty(
    { ...defaultOptions, ...options },
    VECTOR_STYLES.ICON,
    field,
    mockVectorLayer,
    () => {
      return (value: RawValue) => value + '_format';
    }
  );
};

describe('getNumberOfCategories', () => {
  test('should derive category number from palettes', async () => {
    const filled = makeProperty({
      icon_palette_id: 'filledShapes',
    });
    expect(filled.getNumberOfCategories()).toEqual(6);
    const hollow = makeProperty({
      icon_palette_id: 'hollowShapes',
    });
    expect(hollow.getNumberOfCategories()).toEqual(5);
  });
});

describe('renderLegendDetailRow', () => {
  test('Should render categorical legend with breaks', async () => {
    const iconStyle = makeProperty({
      icon_palette_id: 'filledShapes',
    });
    const legendRow = iconStyle.renderLegendDetailRow({ isPointsOnly: true, isLinesOnly: false });
    const component = shallow(legendRow);
    await new Promise((resolve) => process.nextTick(resolve));
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('Should render categorical legend with custom icons in breaks', async () => {
    const iconStyle = makeProperty({
      use_custom_icon_map: true,
      custom_icon_stops: [
        {
          stop: null,
          icon: 'kbn__custom_icon_sdf__foobar',
          icon_source: ICON_SOURCE.CUSTOM,
        },
        {
          stop: 'MX',
          icon: 'marker',
          icon_source: ICON_SOURCE.MAKI,
        },
      ],
    });
    const legendRow = iconStyle.renderLegendDetailRow({ isPointsOnly: true, isLinesOnly: false });
    const component = shallow(legendRow);
    await new Promise((resolve) => process.nextTick(resolve));
    component.update();

    expect(component).toMatchSnapshot();
  });
});

describe('get mapbox icon-image expression (via internal _getMbIconImageExpression)', () => {
  describe('categorical icon palette', () => {
    test('should return mapbox expression for pre-defined icon palette', async () => {
      const iconStyle = makeProperty({
        icon_palette_id: 'filledShapes',
      });
      expect(iconStyle._getMbIconImageExpression()).toEqual([
        'match',
        ['to-string', ['get', 'foobar']],
        'US',
        'circle',
        'CN',
        'marker',
        'square',
      ]);
    });

    test('should return mapbox expression for custom icon palette', async () => {
      const iconStyle = makeProperty({
        use_custom_icon_map: true,
        custom_icon_stops: [
          {
            stop: null,
            icon: 'circle',
            icon_source: ICON_SOURCE.MAKI,
          },
          {
            stop: 'MX',
            icon: 'marker',
            icon_source: ICON_SOURCE.MAKI,
          },
        ],
      });
      expect(iconStyle._getMbIconImageExpression()).toEqual([
        'match',
        ['to-string', ['get', 'foobar']],
        'MX',
        'marker',
        'circle',
      ]);
    });
  });
});
