/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export type Primitive = string | number | boolean | null | undefined;

export const primitive: z.ZodType<Primitive> = z.union([
  z.string().max(65535),
  z.number(),
  z.boolean(),
  z.null(),
  z.undefined(),
]);

export interface RecursiveRecord {
  [key: PropertyKey]: Primitive | Primitive[] | unknown[] | RecursiveRecord;
}

// Maximum combined nesting depth for arrays and records. Both consume from the
// same budget so alternating {a:[{a:[...]}]} patterns cannot bypass the limit.
const MAX_NESTING_DEPTH = 10;

// Build a fixed-depth schema DAG at module load time. Each level reuses the
// same inner schema for both the array and record branches, so the total number
// of schema objects is O(MAX_NESTING_DEPTH) — no exponential blowup. At
// depth 0 only primitives are accepted, preventing unbounded Zod recursion.
function buildBoundedValue(depth: number): z.ZodType<unknown> {
  if (depth === 0) {
    return primitive as z.ZodType<unknown>;
  }
  const inner = buildBoundedValue(depth - 1);
  return z.union([
    primitive,
    z.array(inner).max(1000),
    z.record(z.string().max(1000), inner),
  ]) as z.ZodType<unknown>;
}

const boundedValue = buildBoundedValue(MAX_NESTING_DEPTH);

export const recursiveRecord: z.ZodType<RecursiveRecord> = z
  .record(z.string().max(1000), boundedValue)
  .meta({ id: 'RecursiveRecord' }) as unknown as z.ZodType<RecursiveRecord>;

export type FlattenRecord = Record<PropertyKey, Primitive | Primitive[] | unknown[]>;

export const flattenRecord: z.ZodType<FlattenRecord> = z
  .record(z.string().max(1000), boundedValue)
  .meta({ id: 'FlattenRecord' }) as unknown as z.ZodType<FlattenRecord>;

export const sampleDocument = recursiveRecord;

export type SampleDocument = RecursiveRecord;

export interface IgnoredField {
  field: string;
}

export interface DocumentWithIgnoredFields {
  values?: SampleDocument;
  ignored_fields: IgnoredField[];
}
