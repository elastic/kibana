/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

/** The most estimated tokens a transcript read holds, across all its batches. */
export const MAX_TRANSCRIPTS_READ_TOKENS = 10_000_000;
export const DEFAULT_TRANSCRIPTS_READ_TOKENS = 600_000;
/** The most estimated tokens one batch holds: what one model call reads. */
export const MAX_TRANSCRIPTS_BATCH_TOKENS = 1_000_000;
export const DEFAULT_TRANSCRIPTS_BATCH_TOKENS = 50_000;
/** Events saved this recently are left for the next run: their turn may still be running. */
export const DEFAULT_TRANSCRIPT_SETTLE_MINUTES = 5;

/** A session memory or turn as dreaming reads it: the shape of the memories `applyDreamChanges` takes. */
export const dreamingMemorySchema = lazySchema(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    content: z.string(),
    updated_at: z.string(),
    attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    permissions: z.object({
      kibana: z.object({ privileges: z.array(z.object({ space: z.string() })) }),
    }),
  })
);

export type DreamingMemory = z.infer<typeof dreamingMemorySchema>;
