/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Column major order:
 *
 * Instead of a row major ordered vector representation of a 4 x 4 matrix, we use column major ordered vectors.
 *
 * This is what the matrix is:                  Eg. this is the equivalent matrix of `translate3d(${x}px, ${y}px, ${z}px)`:
 *
 *         a e i m                                                           1 0 0 x
 *         b f j n                                                           0 1 0 y
 *         c g k o                                                           0 0 1 z
 *         d h l p                                                           0 0 0 1
 *
 *  but it's _not_ represented as a 2D array or array of arrays. CSS3 `transform3d` expects it as this vector:
 *
 *      [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p]
 *
 *  so it's clear that the first _column vector_ corresponds to a, b, c, d.
 *
 */

import { Matrix3d, TransformMatrix3d, Vector3d } from '.';

export const NANMATRIX: TransformMatrix3d = [
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
];

export const ORIGIN: Vector3d = [0, 0, 0, 1];
export const RIGHT: Vector3d = [1, 0, 0, 1];
export const UP: Vector3d = [0, 1, 0, 1];
export const TOP_LEFT: Vector3d = [-1, 1, 0, 1];
export const TOP_RIGHT: Vector3d = [1, 1, 0, 1];
export const BOTTOM_LEFT: Vector3d = [-1, -1, 0, 1];
export const BOTTOM_RIGHT: Vector3d = [1, -1, 0, 1];

// prettier-ignore
export const translate = (x: number, y: number, z: number): TransformMatrix3d =>
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];

// prettier-ignore
export const scale = (x: number, y: number, z: number): TransformMatrix3d =>
  [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];

export const rotateZ = (a: number): TransformMatrix3d => {
  const sinA = Math.sin(a);
  const cosA = Math.cos(a);
  return [cosA, -sinA, 0, 0, sinA, cosA, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
};

/**
 * multiply
 *
 * Matrix multiplies two matrices of column major format, returning the result in the same format
 *
 *
 *                               A    E    I    M
 *                               B    F    J    N
 *                               C    G    K    O
 *                               D    H    L    P
 *
 *         a    e    i    m      .    .    .    .
 *         b    f    j    n      .    .    .    .
 *         c    g    k    o      .    .    .    .
 *         d    h    l    p      .    .    .    d * M + h * N + l * O + p * P
 *
 */
// prettier-ignore
const mult = (
  [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p]: TransformMatrix3d,
  [A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P]: TransformMatrix3d
): TransformMatrix3d =>
  [
    a * A + e * B + i * C + m * D,
    b * A + f * B + j * C + n * D,
    c * A + g * B + k * C + o * D,
    d * A + h * B + l * C + p * D,

    a * E + e * F + i * G + m * H,
    b * E + f * F + j * G + n * H,
    c * E + g * F + k * G + o * H,
    d * E + h * F + l * G + p * H,

    a * I + e * J + i * K + m * L,
    b * I + f * J + j * K + n * L,
    c * I + g * J + k * K + o * L,
    d * I + h * J + l * K + p * L,

    a * M + e * N + i * O + m * P,
    b * M + f * N + j * O + n * P,
    c * M + g * N + k * O + o * P,
    d * M + h * N + l * O + p * P,
  ];

export const multiply = (
  first: TransformMatrix3d,
  ...rest: TransformMatrix3d[]
): TransformMatrix3d => rest.reduce((prev, next) => mult(prev, next), first);

/**
 * mvMultiply
 *
 * Multiplies a matrix and a vector
 *
 *
 *                               A
 *                               B
 *                               C
 *                               D
 *
 *         a    e    i    m      .
 *         b    f    j    n      .
 *         c    g    k    o      .
 *         d    h    l    p      d * A + h * B + l * C + p * D
 *
 */
// prettier-ignore
export const mvMultiply = (
  [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p]: TransformMatrix3d,
  [A, B, C, D]: Vector3d
): Vector3d =>
  [
    a * A + e * B + i * C + m * D,
    b * A + f * B + j * C + n * D,
    c * A + g * B + k * C + o * D,
    d * A + h * B + l * C + p * D,
  ];

export const normalize = ([A, B, C, D]: Vector3d): Vector3d =>
  D === 1 ? [A, B, C, D] : [A / D, B / D, C / D, 1];

/**
 * invert
 *
 * Inverts the matrix
 *
 *         a    e    i    m
 *         b    f    j    n
 *         c    g    k    o
 *         d    h    l    p
 *
 */
export const invert = ([
  a,
  b,
  c,
  d,
  e,
  f,
  g,
  h,
  i,
  j,
  k,
  l,
  m,
  n,
  o,
  p,
]: TransformMatrix3d): TransformMatrix3d => {
  const inv: Matrix3d = [
    f * k * p - f * l * o - j * g * p + j * h * o + n * g * l - n * h * k,
    -b * k * p + b * l * o + j * c * p - j * d * o - n * c * l + n * d * k,
    b * g * p - b * h * o - f * c * p + f * d * o + n * c * h - n * d * g,
    -b * g * l + b * h * k + f * c * l - f * d * k - j * c * h + j * d * g,
    -e * k * p + e * l * o + i * g * p - i * h * o - m * g * l + m * h * k,
    a * k * p - a * l * o - i * c * p + i * d * o + m * c * l - m * d * k,
    -a * g * p + a * h * o + e * c * p - e * d * o - m * c * h + m * d * g,
    a * g * l - a * h * k - e * c * l + e * d * k + i * c * h - i * d * g,
    e * j * p - e * l * n - i * f * p + i * h * n + m * f * l - m * h * j,
    -a * j * p + a * l * n + i * b * p - i * d * n - m * b * l + m * d * j,
    a * f * p - a * h * n - e * b * p + e * d * n + m * b * h - m * d * f,
    -a * f * l + a * h * j + e * b * l - e * d * j - i * b * h + i * d * f,
    -e * j * o + e * k * n + i * f * o - i * g * n - m * f * k + m * g * j,
    a * j * o - a * k * n - i * b * o + i * c * n + m * b * k - m * c * j,
    -a * f * o + a * g * n + e * b * o - e * c * n - m * b * g + m * c * f,
    a * f * k - a * g * j - e * b * k + e * c * j + i * b * g - i * c * f,
  ];

  const det = a * inv[0] + b * inv[4] + c * inv[8] + d * inv[12];

  if (det === 0) {
    return NANMATRIX; // no real solution
  } else {
    const recDet = 1 / det;

    for (let index = 0; index < 16; index++) {
      inv[index] *= recDet;
    }

    return inv;
  }
};

// prettier-ignore
export const translateComponent = (a: TransformMatrix3d): TransformMatrix3d =>
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, a[12], a[13], a[14], 1];

export const compositeComponent = ([
  a,
  b,
  c,
  d,
  e,
  f,
  g,
  h,
  i,
  j,
  k,
  l,
  m,
  n,
  o,
  p,
]: TransformMatrix3d): TransformMatrix3d => [a, b, c, d, e, f, g, h, i, j, k, l, 0, 0, 0, p];

// prettier-ignore
export const add = (
  [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p]: TransformMatrix3d,
  [A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P]: TransformMatrix3d
): TransformMatrix3d =>
  [
    a + A,
    b + B,
    c + C,
    d + D,
    e + E,
    f + F,
    g + G,
    h + H,
    i + I,
    j + J,
    k + K,
    l + L,
    m + M,
    n + N,
    o + O,
    p + P,
  ];

// prettier-ignore
export const subtract = (
  [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p]: TransformMatrix3d,
  [A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P]: TransformMatrix3d
): TransformMatrix3d =>
  [
    a - A,
    b - B,
    c - C,
    d - D,
    e - E,
    f - F,
    g - G,
    h - H,
    i - I,
    j - J,
    k - K,
    l - L,
    m - M,
    n - N,
    o - O,
    p - P,
  ];

export const componentProduct = ([a, b, c, d]: Vector3d, [A, B, C, D]: Vector3d): Vector3d => [
  a * A,
  b * B,
  c * C,
  d * D,
];

export const reduceTransforms = (transforms: TransformMatrix3d[]): TransformMatrix3d =>
  transforms.length === 1
    ? transforms[0]
    : transforms.slice(1).reduce((prev, next) => multiply(prev, next), transforms[0]);

const clamp = (low: number, high: number, value: number): number =>
  Math.min(high, Math.max(low, value));

export const matrixToAngle = (transformMatrix: TransformMatrix3d): number => {
  // clamping is needed, otherwise inevitable floating point inaccuracies can cause NaN
  const z0 = Math.acos(clamp(-1, 1, transformMatrix[0]));
  const z1 = Math.asin(clamp(-1, 1, transformMatrix[1]));
  return z1 > 0 ? z0 : -z0;
};
