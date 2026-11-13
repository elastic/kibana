/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  MAX_ASSIGNEES_PER_CASE,
  MAX_CASES_TO_MERGE,
  MAX_CASE_ID_LENGTH,
  MAX_CATEGORY_LENGTH,
  MAX_COMMENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_LENGTH_PER_TAG,
  MAX_TAGS_PER_CASE,
  MAX_TITLE_LENGTH,
  MIN_CASES_TO_MERGE,
} from '../../../constants';
import { limitedArraySchema, limitedStringSchema } from '../../../schema';
import { CaseSeveritySchema, CaseStatusSchema } from '../../domain/case/v1';
import { CaseUserProfileSchema } from '../../domain/user/v1';
import { MergeCopiedTotalsSchema } from '../../domain/user_action/merge/v1';

const CaseIdSchema = lazySchema(() => z.string().max(MAX_CASE_ID_LENGTH));

const MergeCaseIdsSchema = limitedArraySchema({
  codec: CaseIdSchema,
  fieldName: 'caseIds',
  min: MIN_CASES_TO_MERGE,
  max: MAX_CASES_TO_MERGE,
});

/**
 * Preview
 */

export const MergeCasesPreviewRequestSchema = lazySchema(() =>
  z.object({
    caseIds: MergeCaseIdsSchema,
    /** One of `caseIds`. When absent, the preview is computed for a new case. */
    destinationCaseId: CaseIdSchema.optional(),
  })
);

export const MergePreviewCaseSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    version: z.string(),
    title: z.string(),
    incrementalId: z.number().nullable(),
    status: CaseStatusSchema,
    severity: CaseSeveritySchema,
    owner: z.string(),
    createdAt: z.string(),
    totalAlerts: z.number(),
    mergedInto: z.string().nullable(),
  })
);

/**
 * Why a field has the value it has:
 * - `same`: every case that has a value has this one
 * - `only`: only one case has a value
 * - `destination`: the cases differ and the existing destination's value is kept
 * - `oldest`: the cases differ and the oldest case's value is used for the new case
 * - `highest`: the cases differ and the highest severity is used
 * - `combined`: values from every case are combined
 * - `none`: no case has a value
 */
export const MergeFieldProvenanceSchema = lazySchema(() =>
  z.enum(['same', 'only', 'destination', 'oldest', 'highest', 'combined', 'none'])
);

const mergeFieldPreviewSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    provenance: MergeFieldProvenanceSchema,
    /** The case the default value comes from, when it comes from a single case. */
    sourceCaseId: z.string().nullable(),
    /** Every distinct non-empty value with the cases that hold it, in case order. */
    options: z.array(z.object({ value: valueSchema, caseIds: z.array(z.string()) })),
    /** True when two or more cases have different non-empty values. */
    hasConflict: z.boolean(),
  });

const mergeCombinedFieldPreviewSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: z.array(valueSchema),
    provenance: MergeFieldProvenanceSchema,
    max: z.number(),
  });

export const MergeAttachmentSummarySchema = lazySchema(() =>
  z.object({
    /** Attachments of this kind across the original cases, duplicates included. */
    total: z.number(),
    /** Copies skipped because another original or the destination already has them. */
    duplicates: z.number(),
    /** What the merge copies into the destination. */
    toCopy: z.number(),
    /** What the destination already holds and counts toward the limit. */
    existing: z.number(),
    max: z.number().nullable(),
    /** How many have to be removed before the merge fits the limit. */
    overLimit: z.number(),
  })
);

export const MergeCasesPreviewResponseSchema = lazySchema(() =>
  z.object({
    cases: z.array(MergePreviewCaseSchema),
    destinationCaseId: z.string().nullable(),
    fields: z.object({
      title: mergeFieldPreviewSchema(z.string()),
      description: mergeFieldPreviewSchema(z.string()),
      severity: mergeFieldPreviewSchema(CaseSeveritySchema),
      category: mergeFieldPreviewSchema(z.string().nullable()),
      tags: mergeCombinedFieldPreviewSchema(z.string()),
      assignees: mergeCombinedFieldPreviewSchema(CaseUserProfileSchema),
    }),
    attachments: z.object({
      alerts: MergeAttachmentSummarySchema,
      events: MergeAttachmentSummarySchema,
      observables: MergeAttachmentSummarySchema,
      other: MergeAttachmentSummarySchema,
      /** Not copied: files stay on their original cases. */
      files: z.object({ total: z.number() }),
      /** Not copied: comments stay on their original cases. */
      comments: z.object({ total: z.number() }),
    }),
  })
);

/**
 * Merge
 */

export const MergeCasesRequestSchema = lazySchema(() =>
  z.object({
    caseIds: MergeCaseIdsSchema,
    /** One of `caseIds`. When absent, a new case is created. */
    destinationCaseId: CaseIdSchema.optional(),
    fields: z.object({
      title: limitedStringSchema({ fieldName: 'title', min: 1, max: MAX_TITLE_LENGTH }),
      description: limitedStringSchema({
        fieldName: 'description',
        min: 1,
        max: MAX_DESCRIPTION_LENGTH,
      }),
      severity: CaseSeveritySchema,
      category: z
        .union([
          limitedStringSchema({ fieldName: 'category', min: 1, max: MAX_CATEGORY_LENGTH }),
          z.null(),
        ])
        .optional(),
      tags: limitedArraySchema({
        codec: limitedStringSchema({ fieldName: 'tag', min: 1, max: MAX_LENGTH_PER_TAG }),
        fieldName: 'tags',
        min: 0,
        max: MAX_TAGS_PER_CASE,
      }),
      assignees: limitedArraySchema({
        codec: CaseUserProfileSchema,
        fieldName: 'assignees',
        min: 0,
        max: MAX_ASSIGNEES_PER_CASE,
      }).optional(),
    }),
    closeOriginals: z.boolean(),
    note: limitedStringSchema({ fieldName: 'note', min: 1, max: MAX_COMMENT_LENGTH }).optional(),
  })
);

export const MergeFailureStepSchema = lazySchema(() =>
  z.enum(['fields', 'attachments', 'observables', 'mark', 'close', 'activity', 'note'])
);

export const MergeCasesResponseSchema = lazySchema(() =>
  z.object({
    destination: z.object({
      id: z.string(),
      title: z.string(),
      incrementalId: z.number().nullable(),
      isNew: z.boolean(),
    }),
    mergedCaseIds: z.array(z.string()),
    closedCaseIds: z.array(z.string()),
    copied: MergeCopiedTotalsSchema,
    /** Steps that failed after the destination existed. Nothing is rolled back. */
    failures: z.array(
      z.object({
        step: MergeFailureStepSchema,
        caseId: z.string().nullable(),
        message: z.string(),
      })
    ),
  })
);

export type MergeCasesPreviewRequest = z.infer<typeof MergeCasesPreviewRequestSchema>;
export type MergeCasesPreviewResponse = z.infer<typeof MergeCasesPreviewResponseSchema>;
export type MergePreviewCase = z.infer<typeof MergePreviewCaseSchema>;
export type MergeFieldProvenance = z.infer<typeof MergeFieldProvenanceSchema>;
export type MergeAttachmentSummary = z.infer<typeof MergeAttachmentSummarySchema>;
export type MergeCasesRequest = z.infer<typeof MergeCasesRequestSchema>;
export type MergeCasesResponse = z.infer<typeof MergeCasesResponseSchema>;
export type MergeFailureStep = z.infer<typeof MergeFailureStepSchema>;
