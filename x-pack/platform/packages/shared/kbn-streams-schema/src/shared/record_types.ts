/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export type Primitive = string | number | boolean | null | undefined;

export const primitive: z.ZodType<Primitive> = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.undefined(),
]);

export interface RecursiveRecord {
  [key: PropertyKey]: Primitive | Primitive[] | RecursiveRecord;
}

export const recursiveRecord: z.ZodType<RecursiveRecord> = z.lazy(() =>
  z.record(z.union([primitive, z.array(primitive), recursiveRecord]))
);

export type FlattenRecord = Record<PropertyKey, Primitive | Primitive[]>;

export const flattenRecord: z.ZodType<FlattenRecord> = z.record(
  z.union([primitive, z.array(primitive)])
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
