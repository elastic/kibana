import { z } from '@kbn/zod/v4';
import { type StreamlangDSLWithUpdatedAt } from '@kbn/streamlang';
/** Streamlang on ingest plus the `updated_at` cursor managed by the stack. */
export type IngestStreamProcessing = StreamlangDSLWithUpdatedAt;
export declare const ingestStreamProcessingSchema: z.ZodObject<{
    steps: z.ZodArray<z.ZodType<import("@kbn/streamlang/types/streamlang").StreamlangStep, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang/types/streamlang").StreamlangStep, unknown>>>;
    updated_at: z.ZodISODateTime;
}, z.core.$strip>;
