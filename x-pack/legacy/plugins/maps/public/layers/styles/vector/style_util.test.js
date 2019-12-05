/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isOnlySingleFeatureType } from './style_util';
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
