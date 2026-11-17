/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Utility functions for umap-webgpu.
 *
 * Ported from umap-js.
 * Original: Copyright 2019 Google LLC (Apache-2.0)
 * UMAP algorithm: Copyright 2017 Leland McInnes (BSD-3-Clause)
 */

import type { RandomFn } from './types';

/** Random integer in [0, n). */
export function tauRandInt(n: number, random: RandomFn): number {
  return Math.floor(random() * n);
}

/** Random float in [0, 1). */
export function tauRand(random: RandomFn): number {
  return random();
}

/** L2 norm of a vector. */
export function norm(vec: number[]): number {
  let result = 0;
  for (const item of vec) {
    result += item ** 2;
  }
  return Math.sqrt(result);
}

/** Creates an array of length n filled with undefined. */
export function empty(n: number): undefined[] {
  const output: undefined[] = [];
  for (let i = 0; i < n; i++) {
    output.push(undefined);
  }
  return output;
}

/** Creates an array [0, 1, ..., n-1]. */
export function range(n: number): number[] {
  return empty(n).map((_, i) => i);
}

/** Creates an array of length n filled with value v. */
export function filled(n: number, v: number): number[] {
  return empty(n).map(() => v);
}

/** Creates an array of length n filled with zeros. */
export function zeros(n: number): number[] {
  return filled(n, 0);
}

/** Creates an array of length n filled with ones. */
export function ones(n: number): number[] {
  return filled(n, 1);
}

/** Creates a linearly spaced array from a to b of length len. */
export function linear(a: number, b: number, len: number): number[] {
  return empty(len).map((_, i) => a + i * ((b - a) / (len - 1)));
}

/** Sum of array elements. */
export function sum(input: number[]): number {
  return input.reduce((s, val) => s + val, 0);
}

/** Mean of array elements. */
export function mean(input: number[]): number {
  return sum(input) / input.length;
}

/** Maximum value in array. */
export function max(input: number[]): number {
  let m = 0;
  for (let i = 0; i < input.length; i++) {
    m = input[i] > m ? input[i] : m;
  }
  return m;
}

/** Maximum value in a 2D array. */
export function max2d(input: number[][]): number {
  let m = 0;
  for (let i = 0; i < input.length; i++) {
    for (let j = 0; j < input[i].length; j++) {
      m = input[i][j] > m ? input[i][j] : m;
    }
  }
  return m;
}

/**
 * Generate nSamples unique integers from [0, poolSize) via rejection sampling.
 */
export function rejectionSample(nSamples: number, poolSize: number, random: RandomFn): number[] {
  const result = zeros(nSamples);
  for (let i = 0; i < nSamples; i++) {
    let rejectSample = true;
    while (rejectSample) {
      const j = tauRandInt(poolSize, random);
      let broken = false;
      for (let k = 0; k < i; k++) {
        if (j === result[k]) {
          broken = true;
          break;
        }
      }
      if (!broken) {
        rejectSample = false;
      }
      result[i] = j;
    }
  }
  return result;
}

/** Reshapes a 1D array into a 2D array of dimensions [a, b]. */
export function reshape2d<T>(x: T[], a: number, b: number): T[][] {
  if (x.length !== a * b) {
    throw new Error('Array dimensions must match input length.');
  }
  const rows: T[][] = [];
  let index = 0;
  for (let i = 0; i < a; i++) {
    const col: T[] = [];
    for (let j = 0; j < b; j++) {
      col.push(x[index]);
      index += 1;
    }
    rows.push(col);
  }
  return rows;
}
