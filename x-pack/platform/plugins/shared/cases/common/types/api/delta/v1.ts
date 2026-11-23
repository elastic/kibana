/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

export const DeltaCategories = {
  alerts: 'alerts',
  comments: 'comments',
  changes: 'changes',
  evidence: 'evidence',
} as const;

export const MAX_DELTA_ITEMS = 100 as const;

export const CaseDeltaItemSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    category: z.enum(['alerts', 'comments', 'changes', 'evidence']),
    type: z.string(),
    action: z.string(),
    createdAt: z.string(),
    author: z.string().nullable(),
    /** The new value, rule name, or file name, when the user action has one. */
    detail: z.string().nullable(),
    /** How many entities the user action covers. Greater than 1 only for observables. */
    count: z.number(),
  })
);

export const CaseDeltaCountsSchema = lazySchema(() =>
  z.object({
    alerts: z.number(),
    comments: z.number(),
    changes: z.number(),
    evidence: z.number(),
  })
);

export const CaseDeltaResponseSchema = lazySchema(() =>
  z.object({
    since: z.string().nullable(),
    counts: CaseDeltaCountsSchema,
    items: z.array(CaseDeltaItemSchema),
    /** True when the AI summary is enabled and a model is available for the user. */
    aiSummaryAvailable: z.boolean(),
  })
);

export const CaseDeltaSummarySourceSchema = lazySchema(() =>
  z.object({
    /** The number the summary uses to cite the item, as in `[2]`. */
    index: z.number(),
    item: CaseDeltaItemSchema,
  })
);

export const CaseDeltaSummaryResponseSchema = lazySchema(() =>
  z.object({
    summary: z.string(),
    sources: z.array(CaseDeltaSummarySourceSchema),
  })
);

export const CaseViewedResponseSchema = lazySchema(() =>
  z.object({
    since: z.string().nullable(),
  })
);

export type DeltaCategory = (typeof DeltaCategories)[keyof typeof DeltaCategories];
export type CaseDeltaItem = z.infer<typeof CaseDeltaItemSchema>;
export type CaseDeltaCounts = z.infer<typeof CaseDeltaCountsSchema>;
export type CaseDeltaResponse = z.infer<typeof CaseDeltaResponseSchema>;
export type CaseDeltaSummarySource = z.infer<typeof CaseDeltaSummarySourceSchema>;
export type CaseDeltaSummaryResponse = z.infer<typeof CaseDeltaSummaryResponseSchema>;
export type CaseViewedResponse = z.infer<typeof CaseViewedResponseSchema>;
