/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStyleProperty, percentilesValuesToFieldMeta } from './dynamic_style_property';
import { MockField, MockStyle } from './test_helpers/test_util';
import type { IField } from '../../../fields/field';
import type { IVectorLayer } from '../../../layers/vector_layer';
import { DataRequest } from '../../../util/data_request';
import {
  type RawValue,
  SOURCE_META_DATA_REQUEST_ID,
  VECTOR_STYLES,
} from '../../../../../common/constants';

describe('percentilesValuesToFieldMeta', () => {
  test('should return null when values is not defined', () => {
    expect(percentilesValuesToFieldMeta(undefined)).toBeNull();
    expect(percentilesValuesToFieldMeta({})).toBeNull();
  });

  test('should convert values to percentiles field meta', () => {
    expect(percentilesValuesToFieldMeta(undefined)).toBeNull();
    expect(
      percentilesValuesToFieldMeta({
        values: {
          '25.0': 375.0,
          '50.0': 400.0,
          '75.0': 550.0,
        },
      })
    ).toEqual([
      { percentile: '25.0', value: 375.0 },
      { percentile: '50.0', value: 400.0 },
      { percentile: '75.0', value: 550.0 },
    ]);
  });

  test('should remove duplicated percentile percentilesValuesToFieldMeta', () => {
    expect(percentilesValuesToFieldMeta(undefined)).toBeNull();
    expect(
      percentilesValuesToFieldMeta({
        values: {
          '25.0': 375.0,
          '50.0': 375.0,
          '75.0': 550.0,
        },
      })
    ).toEqual([
      { percentile: '25.0', value: 375.0 },
      { percentile: '75.0', value: 550.0 },
    ]);
  });
});

describe('getRangeFieldMeta', () => {
  test.each([
    {
      name: 'falls back to the feature range when Elasticsearch has no values',
      stats: { count: 0, min: null, max: null, avg: null, std_deviation: null },
      expected: { min: 10, max: 30, delta: 20 },
    },
    {
      name: 'preserves a valid zero-valued Elasticsearch range',
      stats: { count: 2, min: 0, max: 0, avg: 0, std_deviation: 0 },
      expected: { min: 0, max: 0, delta: 0 },
    },
  ])('$name', ({ stats, expected }) => {
    const style = new MockStyle({ min: 10, max: 30 });
    const dataRequest = new DataRequest({
      dataId: SOURCE_META_DATA_REQUEST_ID,
      data: { foobar_range: stats },
    });
    const layer = {
      getStyle: () => style,
      getDataRequest: (dataId: string) =>
        dataId === SOURCE_META_DATA_REQUEST_ID ? dataRequest : undefined,
    } as unknown as IVectorLayer;
    const property = new DynamicStyleProperty(
      { field_meta_options: { is_enabled: true } },
      VECTOR_STYLES.FILL_COLOR,
      new MockField({ fieldName: 'foobar', dataType: 'number' }),
      layer,
      () => null
    );

    expect(property.getRangeFieldMeta()).toMatchObject(expected);
  });
});

describe('getFieldMetaOptions', () => {
  const dynamicColorOptions = {
    color: 'Blues',
    color_category: 'palette_0',
    field: {
      name: 'machine.os.keyword',
      origin: 'source',
    },
    field_meta_options: {
      is_enabled: false,
    },
    type: 'CATEGORICAL',
  };

  test('should not automatically enable fieldMeta when field does support field meta from local', () => {
    const property = new DynamicStyleProperty(
      dynamicColorOptions,
      VECTOR_STYLES.FILL_COLOR,
      {
        supportsFieldMetaFromLocalData: () => {
          return true;
        },
      } as unknown as IField,
      {} as unknown as IVectorLayer,
      () => {
        return (value: RawValue) => value + '_format';
      }
    );

    const fieldMetaOptions = property.getFieldMetaOptions();
    expect(fieldMetaOptions.is_enabled).toBe(false);
  });

  test('should automatically enable fieldMeta when field does not support field meta from local', () => {
    const property = new DynamicStyleProperty(
      dynamicColorOptions,
      VECTOR_STYLES.FILL_COLOR,
      {
        supportsFieldMetaFromLocalData: () => {
          return false;
        },
      } as unknown as IField,
      {} as unknown as IVectorLayer,
      () => {
        return (value: RawValue) => value + '_format';
      }
    );

    const fieldMetaOptions = property.getFieldMetaOptions();
    expect(fieldMetaOptions.is_enabled).toBe(true);

    // should not mutate original options state
    expect(dynamicColorOptions.field_meta_options.is_enabled).toBe(false);
  });
});
