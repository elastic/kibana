/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { assignFeatureIds } from './assign_feature_ids';
import { FEATURE_ID_PROPERTY_NAME } from '../../../common/constants';

const featureId = 'myFeature1';

test('should provide unique id when feature.id is not provided', () => {
  const featureCollection = {
    features: [
      {
        properties: {},
      },
      {
        properties: {},
      },
    ],
  };

  const updatedFeatureCollection = assignFeatureIds(featureCollection);
  const feature1 = updatedFeatureCollection.features[0];
  const feature2 = updatedFeatureCollection.features[1];
  expect(typeof feature1.id).toBe('number');
  expect(typeof feature2.id).toBe('number');
  expect(feature1.id).toBe(feature1.properties[FEATURE_ID_PROPERTY_NAME]);
  expect(feature1.id).not.toBe(feature2.id);
});

test('should preserve feature id when provided', () => {
  const featureCollection = {
    features: [
      {
        id: featureId,
        properties: {},
      },
    ],
  };

  const updatedFeatureCollection = assignFeatureIds(featureCollection);
  const feature1 = updatedFeatureCollection.features[0];
  expect(typeof feature1.id).toBe('number');
  expect(feature1.id).not.toBe(feature1.properties[FEATURE_ID_PROPERTY_NAME]);
  expect(feature1.properties[FEATURE_ID_PROPERTY_NAME]).toBe(featureId);
});

test('should preserve feature id for falsy value', () => {
  const featureCollection = {
    features: [
      {
        id: 0,
        properties: {},
      },
    ],
  };

  const updatedFeatureCollection = assignFeatureIds(featureCollection);
  const feature1 = updatedFeatureCollection.features[0];
  expect(typeof feature1.id).toBe('number');
  expect(feature1.id).not.toBe(feature1.properties[FEATURE_ID_PROPERTY_NAME]);
  expect(feature1.properties[FEATURE_ID_PROPERTY_NAME]).toBe(0);
});

test('should not modify original feature properties', () => {
  const featureProperties = {};
  const featureCollection = {
    features: [
      {
        id: featureId,
        properties: featureProperties,
      },
    ],
  };

  const updatedFeatureCollection = assignFeatureIds(featureCollection);
  const feature1 = updatedFeatureCollection.features[0];
  expect(feature1.properties[FEATURE_ID_PROPERTY_NAME]).toBe(featureId);
  expect(featureProperties).not.toHaveProperty(FEATURE_ID_PROPERTY_NAME);
});
