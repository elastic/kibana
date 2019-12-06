/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isOnlySingleFeatureType, scaleValue } from './style_util';
import { VECTOR_SHAPE_TYPES } from '../../sources/vector_feature_types';

describe('isOnlySingleFeatureType', () => {
  describe('source supports single feature type', () => {
    const supportedFeatures = [VECTOR_SHAPE_TYPES.POINT];

    test('Is only single feature type when only supported feature type is target feature type', () => {
      expect(isOnlySingleFeatureType(VECTOR_SHAPE_TYPES.POINT, supportedFeatures)).toBe(true);
    });

    test('Is not single feature type when only supported feature type is not target feature type', () => {
      expect(isOnlySingleFeatureType(VECTOR_SHAPE_TYPES.LINE, supportedFeatures)).toBe(false);
    });
  });

  describe('source supports multiple feature types', () => {
    const supportedFeatures = [
      VECTOR_SHAPE_TYPES.POINT,
      VECTOR_SHAPE_TYPES.LINE,
      VECTOR_SHAPE_TYPES.POLYGON
    ];

    test('Is only single feature type when data only has target feature type', () => {
      const hasFeatureType = {
        [VECTOR_SHAPE_TYPES.POINT]: true,
        [VECTOR_SHAPE_TYPES.LINE]: false,
        [VECTOR_SHAPE_TYPES.POLYGON]: false,
      };
      expect(isOnlySingleFeatureType(VECTOR_SHAPE_TYPES.POINT, supportedFeatures, hasFeatureType)).toBe(true);
    });

    test('Is not single feature type when data has multiple feature types', () => {
      const hasFeatureType = {
        [VECTOR_SHAPE_TYPES.POINT]: true,
        [VECTOR_SHAPE_TYPES.LINE]: true,
        [VECTOR_SHAPE_TYPES.POLYGON]: true,
      };
      expect(isOnlySingleFeatureType(VECTOR_SHAPE_TYPES.LINE, supportedFeatures, hasFeatureType)).toBe(false);
    });

    test('Is not single feature type when data does not have target feature types', () => {
      const hasFeatureType = {
        [VECTOR_SHAPE_TYPES.POINT]: false,
        [VECTOR_SHAPE_TYPES.LINE]: true,
        [VECTOR_SHAPE_TYPES.POLYGON]: false,
      };
      expect(isOnlySingleFeatureType(VECTOR_SHAPE_TYPES.POINT, supportedFeatures, hasFeatureType)).toBe(false);
    });
  });
});

describe('scaleValue', () => {
  test('Should scale value between 0 and 1', () => {
    expect(scaleValue(5, { min: 0, max: 10, delta: 10 })).toBe(0.5);
  });

  test('Should snap value less then range min to 0', () => {
    expect(scaleValue(-1, { min: 0, max: 10, delta: 10 })).toBe(0);
  });

  test('Should snap value greater then range max to 1', () => {
    expect(scaleValue(11, { min: 0, max: 10, delta: 10 })).toBe(1);
  });

  test('Should snap value to 1 when tere is not range delta', () => {
    expect(scaleValue(10, { min: 10, max: 10, delta: 0 })).toBe(1);
  });

  test('Should put value as -1 when value is not provided', () => {
    expect(scaleValue(undefined, { min: 0, max: 10, delta: 10 })).toBe(-1);
  });

  test('Should put value as -1 when range is not provided', () => {
    expect(scaleValue(5, undefined)).toBe(-1);
  });
});
