/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  componentProduct,
  invert,
  mvMultiply,
  normalize,
  ORIGIN,
  RIGHT,
  UP,
  TOP_LEFT,
  BOTTOM_LEFT,
  TOP_RIGHT,
  BOTTOM_RIGHT,
} from './matrix';

import { dotProduct } from './matrix2d';

/**
 * Pure calculations with geometry awareness - a set of rectangles with known size (a, b) and projection (transform matrix)
 */

const cornerScreenPositions = (transformMatrix, a, b) =>
  // for unknown perf gain, this could be cached per shape
  [TOP_LEFT, TOP_RIGHT, BOTTOM_RIGHT, BOTTOM_LEFT].map((corner) =>
    mvMultiply(transformMatrix, componentProduct(corner, [a, b, 0, 1]))
  );

export const insideAABB =
  ({ x, y, a, b }) =>
  (transformMatrix, aa, bb) => {
    const corners = cornerScreenPositions(transformMatrix, aa, bb);
    return corners.every(([xx, yy]) => {
      const result = x - a <= xx && xx <= x + a && y - b <= yy && yy <= y + b;
      return result;
    });
  };

/**
 *
 * a * x0 + b * x1 = x
 * a * y0 + b * y1 = y
 *
 * a, b = ?
 *
 * b = (y - a * y0) / y1
 *
 * a * x0 + b * x1 = x
 *
 * a * x0 + (y - a * y0) / y1 * x1 = x
 *
 * a * x0 + y / y1 * x1 - a * y0 / y1 * x1 = x
 *
 * a * x0 - a * y0 / y1 * x1 = x - y / y1 * x1
 *
 * a * (x0 - y0 / y1 * x1) = x - y / y1 * x1
 *
 * a = (x - y / y1 * x1) / (x0 - y0 / y1 * x1)
 * b = (y - a * y0) / y1
 *
 */

const planeTuple = (transformMatrix, x, y) => {
  // for unknown perf gain, this could be cached per shape
  const centerPoint = normalize(mvMultiply(transformMatrix, ORIGIN));
  const rightPoint = normalize(mvMultiply(transformMatrix, RIGHT));
  const upPoint = normalize(mvMultiply(transformMatrix, UP));
  const x0 = rightPoint[0] - centerPoint[0];
  const y0 = rightPoint[1] - centerPoint[1];
  const x1 = upPoint[0] - centerPoint[0];
  // If the shape is rotated so it's straight up or down (90 deg or -90 deg) then
  // y1 is going to be zero here and cause divide by zero issues further down.
  // The resulting planeVector accounts for this, but it's returning something incorrect that causes z
  // to be calculated incorrectly.
  // So instead we're going to set y1 to almost zero so we don't have to worry abou the divide by zeros
  // and we still end up with an almost correct planeVector
  const y1 = upPoint[1] - centerPoint[1] || 0.00000000001;
  const rightSlope = y1 ? rightPoint[2] - centerPoint[2] : 0; // handle degenerate case: y1 === 0 (infinite slope)
  const upSlope = y1 ? upPoint[2] - centerPoint[2] : 0; // handle degenerate case: y1 === 0 (infinite slope)
  const inverseProjection = invert(transformMatrix);
  const A1 = 1 / (x0 - (y0 / y1) * x1);
  const A2 = -((A1 * x1) / y1);
  const A0 = -A1 * centerPoint[0] - A2 * centerPoint[1];
  const invY1 = -1 / y1;
  const z0 = centerPoint[2] + rightSlope * A0 + upSlope * invY1 * (centerPoint[1] + A0 * y0);
  const zx = A1 * (rightSlope + upSlope * y0 * invY1);
  const zy = -upSlope * invY1 + A2 * (rightSlope + upSlope * y0 * invY1);
  const planeVector = y1 === 0 ? [x, y, centerPoint[2], 1] : [zx, zy, z0];
  return { inverseProjection, planeVector };
};

const rectangleAtPoint = ({ transformMatrix, a, b }, x, y) => {
  const { inverseProjection, planeVector } = planeTuple(transformMatrix, x, y);

  // Determine z (depth) by composing the x, y vector out of local unit x and unit y vectors; by knowing the
  // scalar multipliers for the unit x and unit y vectors, we can determine z from their respective 'slope' (gradient)
  const screenNormalVector = [x, y, 1];
  const z = dotProduct(planeVector, screenNormalVector);

  // We go full tilt with the inverse transform approach because that's general enough to handle any non-pathological
  // composition of transforms. Eg. this is a description of the idea: https://math.stackexchange.com/a/1685315
  // Hmm maybe we should reuse the above right and up unit vectors to establish whether we're within the (a, b) 'radius'
  // rather than using matrix inversion. Bound to be cheaper.

  const intersection = normalize(mvMultiply(inverseProjection, [x, y, z, 1]));
  const [sx, sy] = intersection;
  const inside = Math.abs(sx) <= a && Math.abs(sy) <= b;

  // z is needed downstream, to tell which one is the closest shape hit by an x, y ray (shapes can be tilted in z)
  // it looks weird to even return items where inside === false, but it could be useful for hotspots outside the rectangle

  return {
    z,
    intersection,
    inside,
  };
};

// set of shapes under a specific point
const shapesAtPoint = (shapes, x, y) =>
  shapes.map((shape, index) => ({ ...rectangleAtPoint(shape, x, y), shape, index }));

// Z-order the possibly several shapes under the same point.
// Since CSS X points to the right, Y to the bottom (not the top!) and Z toward the viewer, it's a left-handed coordinate
// system. Yet another wording is that X and Z point toward the expected directions (right, and towards the viewer,
// respectively), but Y is pointing toward the bottom (South). It's called left-handed because we can position the thumb (X),
// index (Y) and middle finger (Z) on the left hand such that they're all perpendicular to one another, and point to the
// positive direction.
//
// If it were a right handed coordinate system, AND Y still pointed down, then Z should increase away from the
// viewer. But that's not the case. So we maximize the Z value to tell what's on top.
export const shapesAt = (shapes, { x, y }) =>
  shapesAtPoint(shapes, x, y)
    .filter((shape) => shape.inside)
    .sort((shape1, shape2) => shape2.z - shape1.z || shape2.index - shape1.index) // stable sort: DOM insertion order!!!
    .map((shape) => shape.shape); // decreasing order, ie. from front (closest to viewer) to back

const getExtremum = (transformMatrix, a, b) => normalize(mvMultiply(transformMatrix, [a, b, 0, 1]));

export const landmarkPoint = (a, b, transformMatrix, k, l) =>
  getExtremum(transformMatrix, k * a, l * b);
