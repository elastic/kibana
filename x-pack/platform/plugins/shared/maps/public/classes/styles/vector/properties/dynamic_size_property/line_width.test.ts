/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicSizeProperty } from './dynamic_size_property';
import { FIELD_ORIGIN, RawValue, VECTOR_STYLES } from '../../../../../../common/constants';
import { IField } from '../../../../fields/field';
import { IVectorLayer } from '../../../../layers/vector_layer';

describe('getMbSizeExpression', () => {
  test('Should return interpolation expression', async () => {
    const field = {
      isValid: () => {
        return true;
      },
      getName: () => {
        return 'foodbar';
      },
      getMbFieldName: () => {
        return 'foobar';
      },
      getOrigin: () => {
        return FIELD_ORIGIN.SOURCE;
      },
      getSource: () => {
        return {
          isMvt: () => {
            return false;
          },
        };
      },
      supportsFieldMetaFromEs: () => {
        return true;
      },
    } as unknown as IField;
    const lineWidth = new DynamicSizeProperty(
      { minSize: 8, maxSize: 32, fieldMetaOptions: { isEnabled: true } },
      VECTOR_STYLES.LINE_WIDTH,
      field,
      {} as unknown as IVectorLayer,
      () => {
        return (value: RawValue) => value + '_format';
      },
      false
    );
    lineWidth.getRangeFieldMeta = () => {
      return {
        min: 0,
        max: 100,
        delta: 100,
      };
    };

    expect(lineWidth.getMbSizeExpression()).toEqual([
      'interpolate',
      ['linear'],
      [
        'coalesce',
        [
          'case',
          ['==', ['feature-state', 'foobar'], null],
          0,
          ['max', ['min', ['to-number', ['feature-state', 'foobar']], 100], 0],
        ],
        0,
      ],
      0,
      8,
      100,
      32,
    ]);
  });
});
