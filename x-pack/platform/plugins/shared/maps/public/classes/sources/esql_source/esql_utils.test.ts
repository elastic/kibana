/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isGeometryColumn } from './esql_utils';

describe('isGeometryColumn', () => {
  test('should return true for geo_point columns', () => {
    expect(isGeometryColumn({ name: 'myColumn', type: 'geo_point' })).toBe(true);
  });

  test('should return true for geo_shape columns', () => {
    expect(isGeometryColumn({ name: 'myColumn', type: 'geo_shape' })).toBe(true);
  });

  test('should return false for non-geometry columns', () => {
    expect(isGeometryColumn({ name: 'myColumn', type: 'string' })).toBe(false);
  });
});
