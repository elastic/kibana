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

const MAX_ARRAY_NESTING_DEPTH = 5;

// Build a fixed-depth bounded-array schema at module load time to prevent
// stack-overflow DoS on deeply nested inputs. z.lazy() defers the
// recursiveRecord reference to parse time (avoiding initialization-order
// issues). Real document samples rarely exceed depth 3.
function buildBoundedArray(depth: number): z.ZodType<unknown[]> {
  if (depth === 0) {
    return z.array(z.union([primitive, z.lazy(() => recursiveRecord)])).max(1000);
  }
  return z.array(
    z.union([primitive, z.lazy(() => recursiveRecord), buildBoundedArray(depth - 1)])
  ).max(1000);
}

const boundedNestedArray = buildBoundedArray(MAX_ARRAY_NESTING_DEPTH);

export const recursiveRecord: z.ZodType<RecursiveRecord> = z
  .lazy(() =>
    z.record(
      z.string().max(1000),
      z.union([primitive, boundedNestedArray, recursiveRecord])
    )
  )
  .meta({ id: 'RecursiveRecord' });

export type FlattenRecord = Record<PropertyKey, Primitive | Primitive[] | unknown[]>;

export const flattenRecord: z.ZodType<FlattenRecord> = z.record(
  z.string().max(1000),
  z.union([primitive, boundedNestedArray])
);

export const sampleDocument = recursiveRecord;

export type SampleDocument = RecursiveRecord;

export interface IgnoredField {
  field: string;
}

export interface DocumentWithIgnoredFields {
  values?: SampleDocument;
  ignored_fields: IgnoredField[];
}
