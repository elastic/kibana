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

// Persisted-definition schema — unbounded for backward compatibility with stored data.
// Streams/units written before this change may have arbitrary nesting, array sizes,
// or field counts; bounding this schema would make them unreadable.
export const recursiveRecord: z.ZodType<RecursiveRecord> = z
  .lazy(() =>
    z.record(
      z.string().max(1000),
      z.union([
        primitive,
        z.array(primitive),
        z.array(z.union([primitive, recursiveRecord])),
        recursiveRecord,
      ])
    )
  )
  .meta({ id: 'RecursiveRecord' });

export type FlattenRecord = Record<PropertyKey, Primitive | Primitive[] | unknown[]>;

// Persisted-definition schema — unbounded for the same backward-compat reason.
export const flattenRecord: z.ZodType<FlattenRecord> = z.record(
  z.string().max(1000),
  z.union([primitive, z.array(primitive), z.array(z.union([primitive, recursiveRecord]))])
);

export const sampleDocument = recursiveRecord;

export type SampleDocument = RecursiveRecord;

// ─── HTTP-request-scoped bounded schemas ─────────────────────────────────────
// These cap nesting depth, array size, and record entry count so that HTTP
// callers cannot make Zod validation or downstream simulation work scale
// without bound. They must NOT be used for stored-definition parsing.

const MAX_NESTING_DEPTH = 10;
const MAX_RECORD_KEYS = 200;

// Build a fixed-depth schema DAG at module load time. Each level reuses the
// same inner schema for both the array and record branches so the total number
// of schema objects is O(MAX_NESTING_DEPTH) — no exponential blowup.
function buildBoundedValue(depth: number): z.ZodType<unknown> {
  if (depth === 0) {
    return primitive as z.ZodType<unknown>;
  }
  const inner = buildBoundedValue(depth - 1);
  const boundedRecord = z.record(z.string().max(1000), inner).superRefine((val, ctx) => {
    if (Object.keys(val).length > MAX_RECORD_KEYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Record may have at most ${MAX_RECORD_KEYS} keys`,
      });
    }
  });
  return z.union([primitive, z.array(inner).max(1000), boundedRecord]) as z.ZodType<unknown>;
}

const boundedValue = buildBoundedValue(MAX_NESTING_DEPTH);

// Bounded top-level record for HTTP request bodies that receive sample documents.
export const boundedFlattenRecord: z.ZodType<FlattenRecord> = z
  .record(
    z.string().max(1000),
    z.union([primitive, z.array(boundedValue).max(1000)]) as z.ZodType<unknown>
  )
  .superRefine((val, ctx) => {
    if (Object.keys(val).length > MAX_RECORD_KEYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Record may have at most ${MAX_RECORD_KEYS} keys`,
      });
    }
  }) as unknown as z.ZodType<FlattenRecord>;

export interface IgnoredField {
  field: string;
}

export interface DocumentWithIgnoredFields {
  values?: SampleDocument;
  ignored_fields: IgnoredField[];
}
