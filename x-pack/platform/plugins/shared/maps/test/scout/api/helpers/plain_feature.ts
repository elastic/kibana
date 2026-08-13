/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type FeatureProperties = Record<string, number | string | boolean>;

interface PlainPoint {
  x: number;
  y: number;
}

/**
 * Copies decoded feature properties into a regular object, since @mapbox/vector-tile builds them
 * with a null prototype, which `toStrictEqual` reports as a type mismatch against object literals.
 */
export const plainProperties = (properties: FeatureProperties): FeatureProperties => ({
  ...properties,
});

/**
 * Converts geometry returned by `loadGeometry` into plain coordinate objects, since @mapbox/vector-tile
 * returns `Point` instances, which `toStrictEqual` reports as a type mismatch against object literals.
 */
export const plainPoints = (geometry: PlainPoint[][]): PlainPoint[][] =>
  geometry.map((line) => line.map(({ x, y }) => ({ x, y })));
