/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  streamlangDSLSchema,
  type StreamlangDSL,
  type StreamlangDSLWithUpdatedAt,
} from '@kbn/streamlang';

export type NativeIngestProcessorContainer = NonNullable<IngestProcessorContainer>;

/** Streamlang on ingest plus the `updated_at` cursor managed by the stack. */
export interface NativeIngestStreamProcessing {
  processors: NativeIngestProcessorContainer[];
  updated_at: string;
}

export type StreamlangIngestStreamProcessing = StreamlangDSLWithUpdatedAt;

export type IngestStreamProcessing = StreamlangDSLWithUpdatedAt | NativeIngestStreamProcessing;
export type ClassicIngestStreamProcessing = IngestStreamProcessing;

export type IngestStreamProcessingUpsert =
  | (Omit<StreamlangDSLWithUpdatedAt, 'updated_at'> & { updated_at?: never })
  | (Omit<NativeIngestStreamProcessing, 'updated_at'> & { updated_at?: never });
export type ClassicIngestStreamProcessingUpsert = IngestStreamProcessingUpsert;
export type StreamlangIngestStreamProcessingUpsert = Omit<
  StreamlangDSLWithUpdatedAt,
  'updated_at'
> & { updated_at?: never };

export const isNativeIngestStreamProcessing = (
  processing: ClassicIngestStreamProcessing
): processing is NativeIngestStreamProcessing => {
  return 'processors' in processing;
};

export const isStreamlangIngestStreamProcessing = (
  processing: ClassicIngestStreamProcessing
): processing is StreamlangDSLWithUpdatedAt => {
  return 'steps' in processing;
};

export const getStreamlangProcessingSteps = (
  processing: ClassicIngestStreamProcessing
): StreamlangDSL['steps'] => {
  return isStreamlangIngestStreamProcessing(processing) ? processing.steps : [];
};

export const getIngestProcessingItemCount = (processing: ClassicIngestStreamProcessing): number => {
  return isNativeIngestStreamProcessing(processing)
    ? processing.processors.length
    : processing.steps.length;
};

const nativeIngestStreamProcessingObjectSchema = z.object({
  processors: z.array(z.record(z.string(), z.any())),
  updated_at: z.iso.datetime(),
});

const nativeIngestStreamProcessingSchema =
  nativeIngestStreamProcessingObjectSchema as z.ZodType<NativeIngestStreamProcessing>;

export const streamlangIngestStreamProcessingSchema = streamlangDSLSchema.merge(
  z.object({ updated_at: z.iso.datetime() })
);

export const streamlangIngestStreamProcessingUpsertSchema =
  streamlangDSLSchema.strict() as z.ZodType<StreamlangIngestStreamProcessingUpsert>;

export const ingestStreamProcessingSchema = z.union([
  streamlangIngestStreamProcessingSchema,
  nativeIngestStreamProcessingSchema,
]);

export const classicIngestStreamProcessingSchema = ingestStreamProcessingSchema;

const nativeIngestStreamProcessingUpsertSchema = z
  .object({
    processors: z.array(z.record(z.string(), z.any())),
  })
  .strict() as z.ZodType<Omit<NativeIngestStreamProcessing, 'updated_at'> & { updated_at?: never }>;

export const ingestStreamProcessingUpsertSchema = z.union([
  streamlangIngestStreamProcessingUpsertSchema,
  nativeIngestStreamProcessingUpsertSchema,
]) as z.ZodType<IngestStreamProcessingUpsert>;

export const classicIngestStreamProcessingUpsertSchema = ingestStreamProcessingUpsertSchema;
