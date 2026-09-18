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

// Handles arbitrarily nested arrays (including arrays of objects) while bounding
// string length at every level. z.lazy is required for mutual recursion with
// recursiveRecord: array items can be primitives, nested arrays, or records.
const boundedArrayItem: z.ZodType<Primitive | RecursiveRecord | unknown[]> = z.lazy(() =>
  z.union([primitive, recursiveRecord, z.array(boundedArrayItem).max(1000)])
);

export const recursiveRecord: z.ZodType<RecursiveRecord> = z
  .lazy(() =>
    z.record(
      z.string().max(1000),
      z.union([primitive, z.array(boundedArrayItem).max(1000), recursiveRecord])
    )
  )
  .meta({ id: 'RecursiveRecord' });

export type FlattenRecord = Record<PropertyKey, Primitive | Primitive[] | unknown[]>;

export const flattenRecord: z.ZodType<FlattenRecord> = z.record(
  z.string().max(1000),
  z.union([primitive, z.array(boundedArrayItem).max(1000)])
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
