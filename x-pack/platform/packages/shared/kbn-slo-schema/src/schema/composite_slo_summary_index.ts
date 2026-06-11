/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { compositeSloMemberWithSummarySchema, compositeSloSummarySchema } from './composite_slo';

/**
 * Canonical shape of a composite summary index document. This single schema is the source of
 * truth for both writing the document (see `buildCompositeSummaryDoc`) and decoding it on read,
 * so the persisted and decoded shapes can never drift apart.
 */
const compositeSloSummaryDocumentSchema = z.object({
  spaceId: z.string(),
  summaryUpdatedAt: z.string(),
  compositeSlo: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    objective: z.object({ target: z.number() }),
    timeWindow: z.object({ duration: z.string(), type: z.string() }),
    budgetingMethod: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  summary: compositeSloSummarySchema,
  unresolvedMemberIds: z.array(z.string()),
  // Optional so documents that predate per-member summaries keep decoding; the reader's consumers
  // fall back to computing members live when absent.
  members: z.array(compositeSloMemberWithSummarySchema).optional(),
});

type CompositeSLOSummaryDocument = z.infer<typeof compositeSloSummaryDocumentSchema>;

export { compositeSloSummaryDocumentSchema };
export type { CompositeSLOSummaryDocument };
