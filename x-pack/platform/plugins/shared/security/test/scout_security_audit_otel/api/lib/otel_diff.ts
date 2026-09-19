/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';

import type { FlatAttributes } from './otlp_log_receiver';

export interface OtelDiff {
  format: string;
  ops: Array<{ op: string; path: string; value?: unknown; oldValue?: unknown }>;
}

/**
 * The OTel SDK drops array-of-object attributes, so the audit appender serializes
 * `kibana.diff` to one JSON string on every flavor. Asserts the flattened keys did
 * not leak through and returns the parsed diff.
 */
export const parseOtelStringifiedDiff = (e: FlatAttributes): OtelDiff => {
  expect(e['kibana.diff.ops']).toBeUndefined();
  expect(e['kibana.diff.format']).toBeUndefined();
  expect(e['kibana.diff.noOps']).toBeUndefined();
  expect(typeof e['kibana.diff']).toBe('string');
  return JSON.parse(e['kibana.diff'] as string) as OtelDiff;
};

export const opAt = (diff: OtelDiff, path: string) => diff.ops.find((op) => op.path === path);
