/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

import {
  MAX_ASSIGNEES_PER_CASE,
  MAX_CASES_PER_PAGE,
  MAX_CASES_TO_UPDATE,
  MAX_CATEGORY_LENGTH,
  MAX_COMMENT_LENGTH,
  MAX_CUSTOM_FIELDS_PER_CASE,
  MAX_DESCRIPTION_LENGTH,
  MAX_LENGTH_PER_TAG,
  MAX_TAGS_PER_CASE,
  MAX_TITLE_LENGTH,
} from '../../constants';
import { caseApiV1 } from '../../types/api';
import type { CasesFindResponse, CasesSimilarResponse } from '../../types/api';
import { caseDomainV1, CaseSeverity, CaseStatuses, ConnectorTypes } from '../../types/domain';
import type { Case, CaseConnector, CaseSettings } from '../../types/domain';

/**
 * ---------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------
 */

const trimmedString = (field: string, { min = 1, max }: { min?: number; max: number }) =>
  z
    .string()
    .trim()
    .refine((value) => value.length >= min, `${field} must be at least ${min} character(s)`)
    .max(max, `${field} must be ${max} characters or fewer`);

const optionalTrimmedString = (field: string, max: number) =>
  z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? undefined : value))
    .refine(
      (value) => (value ? value.length <= max : true),
      `${field} must be ${max} characters or fewer`
    )
    .optional();

const ensureAtLeastOneKey = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.refine(
    (val) =>
      Object.entries(val).some(
        ([, value]) =>
          value !== undefined &&
          value !== null &&
          (Array.isArray(value)
            ? value.length > 0
            : typeof value !== 'object' || Object.keys(value).length > 0)
      ),
    { message: 'At least one property must be provided.' }
  );

const ioTsToZod = <T>(label: string, isFn: (value: unknown) => value is T) =>
  z.custom<T>((value) => isFn(value), { message: `Invalid ${label} payload` });

/**
 * ---------------------------------------------------------------------------
 * Core primitives
 * ---------------------------------------------------------------------------
 */

export const CaseIdSchema = z.string().min(1, 'case_id is required');
export const CaseIdsSchema = z.array(CaseIdSchema).min(1, 'Provide at least one case id');

export const CaseTitleSchema = trimmedString('title', { max: MAX_TITLE_LENGTH });
export const CaseDescriptionSchema = trimmedString('description', { max: MAX_DESCRIPTION_LENGTH });
export const CaseCategorySchema = optionalTrimmedString('category', MAX_CATEGORY_LENGTH).or(
  z.null()
);

export const CaseStatusSchema = z.enum([
  CaseStatuses.open,
  CaseStatuses['in-progress'],
  CaseStatuses.closed,
] as const);
export const CaseSeveritySchema = z.nativeEnum(CaseSeverity);

export const CaseTagsSchema = z
  .array(trimmedString('tag', { max: MAX_LENGTH_PER_TAG }))
  .max(MAX_TAGS_PER_CASE, `A case can only contain ${MAX_TAGS_PER_CASE} tags`);

export const CaseAssigneeSchema = z.object({ uid: z.string().min(1, 'uid is required') });
export const CaseAssigneesSchema = z
  .array(CaseAssigneeSchema)
  .max(MAX_ASSIGNEES_PER_CASE, `A case can only contain ${MAX_ASSIGNEES_PER_CASE} assignees`);

/**
 * CaseConnector schema for workflow steps.
 *
 * Uses ConnectorTypes enum for the type field to ensure only valid connector types are used.
 * The fields property is kept flexible (Record<string, any> | null) because each connector
 * type has different field requirements that are validated by the cases client at runtime
 * using io-ts types (CasePostRequestRt).
 *
 * Valid connector types:
 * - .cases-webhook
 * - .jira
 * - .none (fields must be null)
 * - .resilient
 * - .servicenow (ITSM)
 * - .servicenow-sir (SIR)
 * - .swimlane
 * - .thehive
 */
export const CaseConnectorSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(ConnectorTypes),
  fields: z.record(z.string(), z.any()).nullable(),
}) as z.ZodType<CaseConnector>;

export const CaseSettingsSchema: z.ZodType<CaseSettings> = z.object({
  syncAlerts: z.boolean(),
  extractObservables: z.boolean().optional(),
});

export const CaseCustomFieldSchema = z.object({
  key: z.string(),
  type: z.enum(['text', 'toggle', 'number']),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});
export const CaseCustomFieldsSchema = z
  .array(CaseCustomFieldSchema)
  .max(
    MAX_CUSTOM_FIELDS_PER_CASE,
    `A case can only contain ${MAX_CUSTOM_FIELDS_PER_CASE} custom fields`
  );

/**
 * ---------------------------------------------------------------------------
 * Attachments
 * ---------------------------------------------------------------------------
 */

export const CaseAlertAttachmentSchema = z.object({
  alertId: z.union([z.string(), z.array(z.string()).min(1)]),
  index: z.union([z.string(), z.array(z.string()).min(1)]),
  rule: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  owner: z.string().optional(),
});

export const CaseEventAttachmentSchema = z.object({
  eventId: z.union([z.string(), z.array(z.string()).min(1)]),
  index: z.union([z.string(), z.array(z.string()).min(1)]),
  owner: z.string().optional(),
});

export const CaseFileAttachmentSchema = z.object({
  file_id: z.string(),
  owner: z.string().optional(),
});

export const CaseCommentAttachmentSchema = z.object({
  comment: trimmedString('comment', { max: MAX_COMMENT_LENGTH }),
  owner: z.string().optional(),
  type: z.literal('user').default('user'),
});

export const CaseObservablesAttachmentSchema = z.object({
  type: z.literal('observable'),
  data: z.array(z.record(z.string(), z.any())).min(1),
});

/**
 * ---------------------------------------------------------------------------
 * Update payloads
 * ---------------------------------------------------------------------------
 */

export const CaseUpdateAttributesSchema = ensureAtLeastOneKey(
  z.object({
    title: CaseTitleSchema.optional(),
    description: CaseDescriptionSchema.optional(),
    tags: CaseTagsSchema.optional(),
    severity: CaseSeveritySchema.optional(),
    status: CaseStatusSchema.optional(),
    assignees: CaseAssigneesSchema.optional(),
    connector: CaseConnectorSchema.optional(),
    settings: CaseSettingsSchema.optional(),
    customFields: CaseCustomFieldsSchema.optional(),
    category: CaseCategorySchema,
  })
);

export const CaseUpdateInputSchema = z.object({
  case_id: CaseIdSchema,
  update: CaseUpdateAttributesSchema,
});

export const CasesBulkUpdateInputSchema = z.object({
  case_ids: CaseIdsSchema.max(
    MAX_CASES_TO_UPDATE,
    `A maximum of ${MAX_CASES_TO_UPDATE} cases can be updated at once`
  ),
  update: CaseUpdateAttributesSchema,
});

/**
 * ---------------------------------------------------------------------------
 * Search & discovery
 * ---------------------------------------------------------------------------
 */

export const CasesFindFiltersSchema = z
  .object({
    owner: z.union([z.string(), z.array(z.string()).min(1)]).optional(),
    status: z.union([CaseStatusSchema, z.array(CaseStatusSchema)]).optional(),
    severity: z.union([CaseSeveritySchema, z.array(CaseSeveritySchema)]).optional(),
    tags: z.union([CaseTagsSchema, z.string()]).optional(),
    reporters: z.union([z.array(z.string()).min(1), z.string()]).optional(),
    assignees: z.union([z.array(z.string()).min(1), z.string()]).optional(),
    category: z.union([z.array(z.string()).min(1), z.string()]).optional(),
    customFields: z
      .record(z.string(), z.array(z.union([z.string(), z.boolean(), z.number(), z.null()])))
      .optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .partial();

export const CasesFindInputSchema = z.object({
  search_term: z.string().optional(),
  search_fields: z.array(z.string()).max(10).optional(),
  sort_field: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional(),
  per_page: z.number().int().min(1).max(MAX_CASES_PER_PAGE).optional(),
  filters: CasesFindFiltersSchema.optional(),
});

export const CasesSimilarInputSchema = z.object({
  case_id: CaseIdSchema,
  fields: z.array(z.enum(['title', 'description', 'tags', 'customFields'])).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

/**
 * ---------------------------------------------------------------------------
 * Assignment helpers
 * ---------------------------------------------------------------------------
 */

export const CaseAssignmentInputSchema = z.object({
  case_id: CaseIdSchema,
  assignees: CaseAssigneesSchema.min(1, 'Provide at least one assignee'),
});

export const CaseUnassignmentInputSchema = z.object({
  case_id: CaseIdSchema,
  assignee_ids: z.array(z.string().min(1)).min(1, 'Provide at least one assignee id'),
});

/**
 * ---------------------------------------------------------------------------
 * Output schemas backed by io-ts runtime validation
 * ---------------------------------------------------------------------------
 */

export const CaseResponseSchema = ioTsToZod<Case>('case', caseDomainV1.CaseRt.is);
export const CaseResponseArraySchema = z.array(CaseResponseSchema);

export const CasesFindResponseSchema = ioTsToZod<CasesFindResponse>(
  'cases find response',
  caseApiV1.CasesFindResponseRt.is
);

export const SimilarCasesResponseSchema = ioTsToZod<CasesSimilarResponse>(
  'similar cases response',
  caseApiV1.CasesSimilarResponseRt.is
);
