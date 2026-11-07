/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_ATTACHMENT_ID_LENGTH } from '../../../constants';

export const MAX_CASE_LINKS_PER_REQUEST = 20 as const;

export const CaseLinkRequestSchema = lazySchema(() =>
  z
    .object({
      target_case_ids: z
        .array(z.string().min(1).max(MAX_ATTACHMENT_ID_LENGTH))
        .min(1)
        .max(MAX_CASE_LINKS_PER_REQUEST),
    })
    .strict()
);
export type CaseLinkRequest = z.infer<typeof CaseLinkRequestSchema>;

export const RelatedCaseReasonSchema = lazySchema(() => z.enum(['linked', 'alert']));
export type RelatedCaseReason = z.infer<typeof RelatedCaseReasonSchema>;

export const RelatedCaseSummarySchema = lazySchema(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    owner: z.string(),
    incremental_id: z.number().nullable(),
    status: z.string(),
    status_key: z.string().nullable(),
    close_reason: z.string().nullable(),
    ai_verdict: z.string().nullable(),
    restricted: z.boolean(),
    updated_at: z.string().nullable(),
    /** Why the case is related. `linked` cases sort first. */
    reasons: z.array(RelatedCaseReasonSchema),
    /** For the `alert` reason: the shared alert ids (at most a few). */
    shared_alert_ids: z.array(z.string()),
  })
);
export type RelatedCaseSummary = z.infer<typeof RelatedCaseSummarySchema>;

export const RelatedCasesResponseSchema = lazySchema(() =>
  z.object({
    cases: z.array(RelatedCaseSummarySchema),
    /** Linked cases the viewer can't see. Only the count is returned. */
    inaccessible_linked_count: z.number(),
  })
);
export type RelatedCasesResponse = z.infer<typeof RelatedCasesResponseSchema>;
