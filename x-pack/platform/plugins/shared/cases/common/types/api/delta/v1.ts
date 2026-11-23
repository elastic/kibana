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
  })
);

export const CaseViewedResponseSchema = lazySchema(() =>
  z.object({
    since: z.string().nullable(),
  })
);

export type DeltaCategory = (typeof DeltaCategories)[keyof typeof DeltaCategories];
export type CaseDeltaCounts = z.infer<typeof CaseDeltaCountsSchema>;
export type CaseDeltaResponse = z.infer<typeof CaseDeltaResponseSchema>;
export type CaseViewedResponse = z.infer<typeof CaseViewedResponseSchema>;
