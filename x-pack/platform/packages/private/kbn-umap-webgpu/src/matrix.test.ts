/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SparseMatrix,
  transpose,
  add,
  subtract,
  pairwiseMultiply,
  multiplyScalar,
  eliminateZeros,
  maximum,
  getCSR,
} from './matrix';

describe('SparseMatrix', () => {
  it('constructs and retrieves values', () => {
    const m = new SparseMatrix([0, 1], [1, 0], [3, 5], [2, 2]);
    expect(m.get(0, 1)).toBe(3);
    expect(m.get(1, 0)).toBe(5);
    expect(m.get(0, 0)).toBe(0); // default
  });

  it('set updates values', () => {
    const m = new SparseMatrix([], [], [], [2, 2]);
    m.set(0, 1, 42);
    expect(m.get(0, 1)).toBe(42);
    m.set(0, 1, 99);
    expect(m.get(0, 1)).toBe(99);
  });

  it('getDims returns dimensions', () => {
    const m = new SparseMatrix([], [], [], [3, 4]);
    expect(m.getDims()).toEqual([3, 4]);
  });

  it('toArray produces dense matrix', () => {
    const m = new SparseMatrix([0, 1], [1, 0], [2, 3], [2, 2]);
    expect(m.toArray()).toEqual([
      [0, 2],
      [3, 0],
    ]);
  });

  it('map transforms values', () => {
    const m = new SparseMatrix([0, 1], [0, 1], [2, 3], [2, 2]);
    const result = m.map((v) => v * 2);
    expect(result.get(0, 0)).toBe(4);
    expect(result.get(1, 1)).toBe(6);
  });
});

describe('matrix operations', () => {
  it('transpose swaps rows and cols', () => {
    const m = new SparseMatrix([0], [1], [5], [2, 3]);
    const t = transpose(m);
    expect(t.nRows).toBe(3);
    expect(t.nCols).toBe(2);
    expect(t.get(1, 0)).toBe(5);
  });

  it('add combines two matrices', () => {
    const a = new SparseMatrix([0, 1], [0, 1], [1, 2], [2, 2]);
    const b = new SparseMatrix([0, 1], [0, 1], [3, 4], [2, 2]);
    const result = add(a, b);
    expect(result.get(0, 0)).toBe(4);
    expect(result.get(1, 1)).toBe(6);
  });

  it('subtract works correctly', () => {
    const a = new SparseMatrix([0], [0], [5], [2, 2]);
    const b = new SparseMatrix([0], [0], [3], [2, 2]);
    const result = subtract(a, b);
    expect(result.get(0, 0)).toBe(2);
  });

  it('pairwiseMultiply multiplies element-wise', () => {
    const a = new SparseMatrix([0], [0], [3], [2, 2]);
    const b = new SparseMatrix([0], [0], [4], [2, 2]);
    const result = pairwiseMultiply(a, b);
    expect(result.get(0, 0)).toBe(12);
  });

  it('multiplyScalar scales values', () => {
    const a = new SparseMatrix([0, 1], [0, 1], [2, 3], [2, 2]);
    const result = multiplyScalar(a, 10);
    expect(result.get(0, 0)).toBe(20);
    expect(result.get(1, 1)).toBe(30);
  });

  it('eliminateZeros removes zero entries', () => {
    const m = new SparseMatrix([0, 0, 1], [0, 1, 0], [0, 5, 0], [2, 2]);
    const result = eliminateZeros(m);
    expect(result.getValues()).toEqual([5]);
  });

  it('maximum takes element-wise max', () => {
    const a = new SparseMatrix([0, 1], [0, 1], [1, 5], [2, 2]);
    const b = new SparseMatrix([0, 1], [0, 1], [3, 2], [2, 2]);
    const result = maximum(a, b);
    expect(result.get(0, 0)).toBe(3);
    expect(result.get(1, 1)).toBe(5);
  });

  it('getCSR returns correct format', () => {
    const m = new SparseMatrix([0, 0, 1], [0, 1, 0], [1, 2, 3], [2, 2]);
    const csr = getCSR(m);
    expect(csr.indptr).toEqual([0, 2]);
    expect(csr.indices).toEqual([0, 1, 0]);
    expect(csr.values).toEqual([1, 2, 3]);
  });
});
