/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamLifecycle } from '@kbn/streams-schema';

/**
 * Determines if a stream has changed retention from the default.
 *
 * @param lifecycle - The stream's lifecycle configuration
 * @returns true if retention is changed from default, false otherwise
 *
 * Simple logic:
 * - inherit: {} = Default retention (false)
 * - dsl: {} = Forever retention (true)
 * - dsl: { data_retention: "30d" } = Custom retention (true)
 * - ilm: { policy: "policy" } = ILM retention (true)
 */
export function hasChangedRetention(lifecycle: IngestStreamLifecycle | undefined): boolean {
  return !!(lifecycle && 'dsl' in lifecycle);
}

/**
 * Calculates percentiles from an array of numbers
 * @param arr - Array of numbers
 * @param p - Array of percentile values (0-100)
 * @returns Array of percentile values
 */
export function percentiles(arr: number[], p: number[]): number[] {
  const sorted = arr.slice().sort((a, b) => a - b);
  return p.map((percent) => {
    if (sorted.length === 0) {
      return 0;
    }
    const pos = (sorted.length - 1) * (percent / 100);
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  });
}

/**
 * Lightweight stream type detection utilities for telemetry collection.
 *
 * These are optimized versions that avoid the overhead of full schema validation
 * during telemetry collection. Compatibility with Streams.*.Definition.is()
 * type guards is maintained through comprehensive tests.
 */

/**
 * Lightweight check if a stream definition is a classic stream
 * @param definition - Stream definition object
 * @returns true if classic stream, false otherwise
 */
export function isClassicStream(definition: any): boolean {
  return !!(
    definition &&
    typeof definition === 'object' &&
    definition.ingest &&
    typeof definition.ingest === 'object' &&
    definition.ingest.classic &&
    typeof definition.ingest.classic === 'object'
  );
}

/**
 * Lightweight check if a stream definition is a wired stream
 * @param definition - Stream definition object
 * @returns true if wired stream, false otherwise
 */
export function isWiredStream(definition: any): boolean {
  return !!(
    definition &&
    typeof definition === 'object' &&
    definition.ingest &&
    typeof definition.ingest === 'object' &&
    definition.ingest.wired &&
    typeof definition.ingest.wired === 'object'
  );
}

/**
 * Lightweight check if a stream definition is a group stream
 * @param definition - Stream definition object
 * @returns true if group stream, false otherwise
 */
export function isGroupStream(definition: any): boolean {
  return !!(definition && typeof definition === 'object' && 'group' in definition);
}

export const isDevMode = () => process.env.NODE_ENV !== 'production';
