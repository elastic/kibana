/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Sparse matrix operations for umap-webgpu.
 *
 * Ported from umap-js.
 * Original: Copyright 2019 Google LLC (Apache-2.0)
 * UMAP algorithm: Copyright 2017 Leland McInnes (BSD-3-Clause)
 */

import * as utils from './utils';

interface Entry {
  value: number;
  row: number;
  col: number;
}

/**
 * Internal 2-dimensional sparse matrix class.
 */
export class SparseMatrix {
  private entries = new Map<string, Entry>();

  readonly nRows: number = 0;
  readonly nCols: number = 0;

  constructor(rows: number[], cols: number[], values: number[], dims: number[]) {
    if (rows.length !== cols.length || rows.length !== values.length) {
      throw new Error('rows, cols and values arrays must all have the same length');
    }
    this.nRows = dims[0];
    this.nCols = dims[1];
    for (let i = 0; i < values.length; i++) {
      const row = rows[i];
      const col = cols[i];
      this.checkDims(row, col);
      const key = this.makeKey(row, col);
      this.entries.set(key, { value: values[i], row, col });
    }
  }

  private makeKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  private checkDims(row: number, col: number): void {
    if (row >= this.nRows || col >= this.nCols) {
      throw new Error('row and/or col specified outside of matrix dimensions');
    }
  }

  set(row: number, col: number, value: number): void {
    this.checkDims(row, col);
    const key = this.makeKey(row, col);
    if (!this.entries.has(key)) {
      this.entries.set(key, { value, row, col });
    } else {
      this.entries.get(key)!.value = value;
    }
  }

  get(row: number, col: number, defaultValue = 0): number {
    this.checkDims(row, col);
    const key = this.makeKey(row, col);
    if (this.entries.has(key)) {
      return this.entries.get(key)!.value;
    }
    return defaultValue;
  }

  getAll(ordered = true): Entry[] {
    const rowColValues: Entry[] = [];
    this.entries.forEach((value) => {
      rowColValues.push(value);
    });
    if (ordered) {
      rowColValues.sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row));
    }
    return rowColValues;
  }

  getDims(): number[] {
    return [this.nRows, this.nCols];
  }

  getRows(): number[] {
    return Array.from(this.entries, ([, value]) => value.row);
  }

  getCols(): number[] {
    return Array.from(this.entries, ([, value]) => value.col);
  }

  getValues(): number[] {
    return Array.from(this.entries, ([, value]) => value.value);
  }

  forEach(fn: (value: number, row: number, col: number) => void): void {
    this.entries.forEach((v) => fn(v.value, v.row, v.col));
  }

  map(fn: (value: number, row: number, col: number) => number): SparseMatrix {
    const vals: number[] = [];
    this.entries.forEach((v) => {
      vals.push(fn(v.value, v.row, v.col));
    });
    const dims = [this.nRows, this.nCols];
    return new SparseMatrix(this.getRows(), this.getCols(), vals, dims);
  }

  toArray(): number[][] {
    const output = utils.empty(this.nRows).map(() => utils.zeros(this.nCols));
    this.entries.forEach((v) => {
      output[v.row][v.col] = v.value;
    });
    return output;
  }
}

/** Transpose a sparse matrix. */
export function transpose(m: SparseMatrix): SparseMatrix {
  const cols: number[] = [];
  const rows: number[] = [];
  const vals: number[] = [];
  m.forEach((value, row, col) => {
    cols.push(row);
    rows.push(col);
    vals.push(value);
  });
  return new SparseMatrix(rows, cols, vals, [m.nCols, m.nRows]);
}

/** Construct a sparse identity matrix. */
export function identity(size: number[]): SparseMatrix {
  const [rows] = size;
  const m = new SparseMatrix([], [], [], size);
  for (let i = 0; i < rows; i++) {
    m.set(i, i, 1);
  }
  return m;
}

/** Element-wise multiplication. */
export function pairwiseMultiply(a: SparseMatrix, b: SparseMatrix): SparseMatrix {
  return elementWise(a, b, (x, y) => x * y);
}

/** Element-wise addition. */
export function add(a: SparseMatrix, b: SparseMatrix): SparseMatrix {
  return elementWise(a, b, (x, y) => x + y);
}

/** Element-wise subtraction. */
export function subtract(a: SparseMatrix, b: SparseMatrix): SparseMatrix {
  return elementWise(a, b, (x, y) => x - y);
}

/** Element-wise maximum. */
export function maximum(a: SparseMatrix, b: SparseMatrix): SparseMatrix {
  return elementWise(a, b, (x, y) => (x > y ? x : y));
}

/** Scalar multiplication. */
export function multiplyScalar(a: SparseMatrix, scalar: number): SparseMatrix {
  return a.map((value: number) => value * scalar);
}

/** Remove zero entries. */
export function eliminateZeros(m: SparseMatrix): SparseMatrix {
  const zeroIndices = new Set<number>();
  const values = m.getValues();
  const rows = m.getRows();
  const cols = m.getCols();
  for (let i = 0; i < values.length; i++) {
    if (values[i] === 0) {
      zeroIndices.add(i);
    }
  }
  const keep = (_: unknown, index: number) => !zeroIndices.has(index);
  return new SparseMatrix(rows.filter(keep), cols.filter(keep), values.filter(keep), m.getDims());
}

export enum NormType {
  max = 'max',
  l1 = 'l1',
  l2 = 'l2',
}

type NormFns = { [key in NormType]: (v: number[]) => number[] };

const normFns: NormFns = {
  [NormType.max]: (xs: number[]) => {
    let mx = -Infinity;
    for (let i = 0; i < xs.length; i++) {
      mx = xs[i] > mx ? xs[i] : mx;
    }
    return xs.map((x) => x / mx);
  },
  [NormType.l1]: (xs: number[]) => {
    let s = 0;
    for (let i = 0; i < xs.length; i++) {
      s += xs[i];
    }
    return xs.map((x) => x / s);
  },
  [NormType.l2]: (xs: number[]) => {
    let s = 0;
    for (let i = 0; i < xs.length; i++) {
      s += xs[i] ** 2;
    }
    return xs.map((x) => Math.sqrt(x ** 2 / s));
  },
};

/** Normalize a sparse matrix row-wise. */
export function normalize(m: SparseMatrix, normType = NormType.l2): SparseMatrix {
  const normFn = normFns[normType];
  const colsByRow = new Map<number, number[]>();
  m.forEach((_, row, col) => {
    const cols = colsByRow.get(row) || [];
    cols.push(col);
    colsByRow.set(row, cols);
  });

  const nextMatrix = new SparseMatrix([], [], [], m.getDims());
  for (const row of colsByRow.keys()) {
    const cols = colsByRow.get(row)!.sort((a, b) => a - b);
    const vals = cols.map((col) => m.get(row, col));
    const normed = normFn(vals);
    for (let i = 0; i < normed.length; i++) {
      nextMatrix.set(row, cols[i], normed[i]);
    }
  }
  return nextMatrix;
}

/** Get CSR representation of a sparse matrix. */
export function getCSR(x: SparseMatrix): {
  indices: number[];
  values: number[];
  indptr: number[];
} {
  const entries: Entry[] = [];
  x.forEach((value, row, col) => {
    entries.push({ value, row, col });
  });
  entries.sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row));

  const indices: number[] = [];
  const values: number[] = [];
  const indptr: number[] = [];

  let currentRow = -1;
  for (let i = 0; i < entries.length; i++) {
    const { row, col, value } = entries[i];
    if (row !== currentRow) {
      currentRow = row;
      indptr.push(i);
    }
    indices.push(col);
    values.push(value);
  }
  return { indices, values, indptr };
}

/** Helper: apply element-wise binary op across two sparse matrices. */
function elementWise(
  a: SparseMatrix,
  b: SparseMatrix,
  op: (x: number, y: number) => number
): SparseMatrix {
  const visited = new Set<string>();
  const rows: number[] = [];
  const cols: number[] = [];
  const vals: number[] = [];

  const operate = (row: number, col: number) => {
    rows.push(row);
    cols.push(col);
    vals.push(op(a.get(row, col), b.get(row, col)));
  };

  const valuesA = a.getValues();
  const rowsA = a.getRows();
  const colsA = a.getCols();
  for (let i = 0; i < valuesA.length; i++) {
    const key = `${rowsA[i]}:${colsA[i]}`;
    visited.add(key);
    operate(rowsA[i], colsA[i]);
  }

  const rowsB = b.getRows();
  const colsB = b.getCols();
  for (let i = 0; i < rowsB.length; i++) {
    const key = `${rowsB[i]}:${colsB[i]}`;
    if (visited.has(key)) continue;
    operate(rowsB[i], colsB[i]);
  }

  return new SparseMatrix(rows, cols, vals, [a.nRows, a.nCols]);
}
