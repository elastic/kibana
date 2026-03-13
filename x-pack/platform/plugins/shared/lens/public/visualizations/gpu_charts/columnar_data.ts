/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { GpuColumnarData, DataBounds } from './types';
import { reservoirSampleIndices } from './lod_selection';
import { GPU_LIMITS } from './constants';

/**
 * Convert a Datatable to columnar GPU-ready format
 * This performs the transformation from row-based to columnar TypedArrays
 */
export function datatableToColumnar(
  datatable: Datatable,
  accessors: {
    x: string;
    y: string;
    z?: string;
    color?: string;
    size?: string;
    group?: string;
  },
  options?: {
    maxPoints?: number;
    samplingRate?: number;
    seed?: number;
  }
): GpuColumnarData {
  const rows = datatable.rows;
  const length = rows.length;

  // Determine if we need to sample
  const maxPoints = options?.maxPoints ?? GPU_LIMITS.MAX_RENDER_POINTS;
  const needsSampling = length > maxPoints;
  const sampleSize = needsSampling ? maxPoints : length;

  // Get sample indices if needed
  const indices = needsSampling ? reservoirSampleIndices(length, sampleSize, options?.seed) : null;

  // Initialize typed arrays
  const x = new Float32Array(sampleSize);
  const y = new Float32Array(sampleSize);
  const z = accessors.z ? new Float32Array(sampleSize) : undefined;
  const color = accessors.color ? new Float32Array(sampleSize) : undefined;
  const size = accessors.size ? new Float32Array(sampleSize) : undefined;
  const group = accessors.group ? new Uint32Array(sampleSize) : undefined;

  // Track bounds for normalization
  const bounds: DataBounds = {
    x: { min: Infinity, max: -Infinity },
    y: { min: Infinity, max: -Infinity },
  };

  if (z) bounds.z = { min: Infinity, max: -Infinity };
  if (color) bounds.color = { min: Infinity, max: -Infinity };
  if (size) bounds.size = { min: Infinity, max: -Infinity };

  // Group value to index mapping
  const groupMap = new Map<string | number, number>();
  let nextGroupIndex = 0;

  // Extract data into typed arrays
  for (let i = 0; i < sampleSize; i++) {
    const rowIndex = indices ? indices[i] : i;
    const row = rows[rowIndex];

    // X value
    const xVal = Number(row[accessors.x]) || 0;
    x[i] = xVal;
    bounds.x.min = Math.min(bounds.x.min, xVal);
    bounds.x.max = Math.max(bounds.x.max, xVal);

    // Y value
    const yVal = Number(row[accessors.y]) || 0;
    y[i] = yVal;
    bounds.y.min = Math.min(bounds.y.min, yVal);
    bounds.y.max = Math.max(bounds.y.max, yVal);

    // Z value (optional)
    if (z && accessors.z) {
      const zVal = Number(row[accessors.z]) || 0;
      z[i] = zVal;
      bounds.z!.min = Math.min(bounds.z!.min, zVal);
      bounds.z!.max = Math.max(bounds.z!.max, zVal);
    }

    // Color value (optional)
    if (color && accessors.color) {
      const colorVal = Number(row[accessors.color]) || 0;
      color[i] = colorVal;
      bounds.color!.min = Math.min(bounds.color!.min, colorVal);
      bounds.color!.max = Math.max(bounds.color!.max, colorVal);
    }

    // Size value (optional)
    if (size && accessors.size) {
      const sizeVal = Number(row[accessors.size]) || 1;
      size[i] = sizeVal;
      bounds.size!.min = Math.min(bounds.size!.min, sizeVal);
      bounds.size!.max = Math.max(bounds.size!.max, sizeVal);
    }

    // Group value (optional) - convert to numeric index
    if (group && accessors.group) {
      const groupVal = row[accessors.group];
      let groupIndex = groupMap.get(groupVal);
      if (groupIndex === undefined) {
        groupIndex = nextGroupIndex++;
        groupMap.set(groupVal, groupIndex);
      }
      group[i] = groupIndex;
    }
  }

  return {
    x,
    y,
    z,
    color,
    size,
    group,
    length: sampleSize,
    bounds,
  };
}

/**
 * Normalize columnar data to 0-1 range for GPU rendering
 * Modifies arrays in place for efficiency
 */
export function normalizeColumnarData(data: GpuColumnarData): GpuColumnarData {
  normalizeArray(data.x, data.bounds.x);
  normalizeArray(data.y, data.bounds.y);

  if (data.z && data.bounds.z) {
    normalizeArray(data.z, data.bounds.z);
  }

  if (data.color && data.bounds.color) {
    normalizeArray(data.color, data.bounds.color);
  }

  if (data.size && data.bounds.size) {
    normalizeArray(data.size, data.bounds.size);
  }

  return data;
}

/**
 * Normalize a Float32Array to 0-1 range in place
 */
function normalizeArray(arr: Float32Array, bounds: { min: number; max: number }): void {
  const range = bounds.max - bounds.min;
  if (range === 0) {
    // All values are the same, set to 0.5
    arr.fill(0.5);
    return;
  }

  const invRange = 1 / range;
  for (let i = 0; i < arr.length; i++) {
    arr[i] = (arr[i] - bounds.min) * invRange;
  }
}

/**
 * Create columnar data from ES|QL columnar response
 * This is the zero-copy path when ES|QL returns columnar data
 */
export function esqlColumnarToGpu(
  columns: Array<{ name: string; values: ArrayLike<number | string> }>,
  accessors: {
    x: string;
    y: string;
    z?: string;
    color?: string;
    size?: string;
  }
): GpuColumnarData {
  const xCol = columns.find((c) => c.name === accessors.x);
  const yCol = columns.find((c) => c.name === accessors.y);

  if (!xCol || !yCol) {
    throw new Error('Required x and y columns not found in ES|QL response');
  }

  const length = xCol.values.length;

  // Convert to Float32Array if not already
  const x = toFloat32Array(xCol.values);
  const y = toFloat32Array(yCol.values);

  const zCol = accessors.z ? columns.find((c) => c.name === accessors.z) : undefined;
  const colorCol = accessors.color ? columns.find((c) => c.name === accessors.color) : undefined;
  const sizeCol = accessors.size ? columns.find((c) => c.name === accessors.size) : undefined;

  const z = zCol ? toFloat32Array(zCol.values) : undefined;
  const color = colorCol ? toFloat32Array(colorCol.values) : undefined;
  const size = sizeCol ? toFloat32Array(sizeCol.values) : undefined;

  // Calculate bounds
  const bounds: DataBounds = {
    x: calculateBounds(x),
    y: calculateBounds(y),
  };

  if (z) bounds.z = calculateBounds(z);
  if (color) bounds.color = calculateBounds(color);
  if (size) bounds.size = calculateBounds(size);

  return {
    x,
    y,
    z,
    color,
    size,
    length,
    bounds,
  };
}

/**
 * Convert an array-like to Float32Array
 */
function toFloat32Array(values: ArrayLike<number | string>): Float32Array {
  if (values instanceof Float32Array) {
    return values;
  }

  const result = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) {
    result[i] = Number(values[i]) || 0;
  }
  return result;
}

/**
 * Calculate min/max bounds of a Float32Array
 */
function calculateBounds(arr: Float32Array): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    if (val < min) min = val;
    if (val > max) max = val;
  }

  return { min, max };
}
