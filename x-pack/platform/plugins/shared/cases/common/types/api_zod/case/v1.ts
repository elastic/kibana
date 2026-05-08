/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  CASE_EXTENDED_FIELDS,
  MAX_ASSIGNEES_FILTER_LENGTH,
  MAX_ASSIGNEES_PER_CASE,
  MAX_BULK_GET_CASES,
  MAX_CASES_PER_PAGE,
  MAX_CASES_TO_UPDATE,
  MAX_CATEGORY_FILTER_LENGTH,
  MAX_CATEGORY_LENGTH,
  MAX_CUSTOM_FIELDS_PER_CASE,
  MAX_DELETE_IDS_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_LENGTH_PER_TAG,
  MAX_REPORTERS_FILTER_LENGTH,
  MAX_TAGS_FILTER_LENGTH,
  MAX_TAGS_PER_CASE,
  MAX_TITLE_LENGTH,
} from '../../../constants';
import {
  limitedArraySchema,
  limitedStringSchema,
  NonEmptyString,
  paginationSchema,
} from '../../../schema_zod';
import {
  CaseCustomFieldToggleSchema,
  CustomFieldTextTypeSchema,
  CustomFieldNumberTypeSchema,
} from '../../domain_zod/custom_field/v1';
import {
  CaseSchema,
  CasesSchema,
  CaseSettingsSchema,
  CaseSeveritySchema,
  CaseStatusSchema,
  CaseTemplateSchema,
  RelatedCaseSchema,
  SimilarCaseSchema,
} from '../../domain_zod/case/v1';
import { CaseConnectorSchema } from '../../domain_zod/connector/v1';
import { CaseUserProfileSchema, UserSchema } from '../../domain_zod/user/v1';
import { CasesStatusResponseSchema } from '../stats/v1';
import {
  CaseCustomFieldTextWithValidationValueSchema,
  CaseCustomFieldNumberWithValidationValueSchema,
} from '../custom_field/v1';

const CaseCustomFieldTextWithValidationSchema = z.object({
  key: z.string(),
  type: CustomFieldTextTypeSchema,
  value: z.union([CaseCustomFieldTextWithValidationValueSchema('value'), z.null()]),
});

const CaseCustomFieldNumberWithValidationSchema = z.object({
  key: z.string(),
  type: CustomFieldNumberTypeSchema,
  value: z.union([
    CaseCustomFieldNumberWithValidationValueSchema({ fieldName: 'value' }),
    z.null(),
  ]),
});

const CustomFieldForRequestSchema = z.union([
  CaseCustomFieldTextWithValidationSchema,
  CaseCustomFieldToggleSchema,
  CaseCustomFieldNumberWithValidationSchema,
]);

export const CaseRequestCustomFieldsSchema = limitedArraySchema({
  codec: CustomFieldForRequestSchema,
  fieldName: 'customFields',
  min: 0,
  max: MAX_CUSTOM_FIELDS_PER_CASE,
});

export const CaseBaseOptionalFieldsRequestSchema = z.object({
  description: limitedStringSchema({
    fieldName: 'description',
    min: 1,
    max: MAX_DESCRIPTION_LENGTH,
  }).optional(),
  tags: limitedArraySchema({
    codec: limitedStringSchema({ fieldName: 'tag', min: 1, max: MAX_LENGTH_PER_TAG }),
    min: 0,
    max: MAX_TAGS_PER_CASE,
    fieldName: 'tags',
  }).optional(),
  title: limitedStringSchema({ fieldName: 'title', min: 1, max: MAX_TITLE_LENGTH }).optional(),
  connector: CaseConnectorSchema.optional(),
  severity: CaseSeveritySchema.optional(),
  assignees: limitedArraySchema({
    codec: CaseUserProfileSchema,
    fieldName: 'assignees',
    min: 0,
    max: MAX_ASSIGNEES_PER_CASE,
  }).optional(),
  category: z
    .union([
      limitedStringSchema({ fieldName: 'category', min: 1, max: MAX_CATEGORY_LENGTH }),
      z.null(),
    ])
    .optional(),
  customFields: CaseRequestCustomFieldsSchema.optional(),
  settings: CaseSettingsSchema.optional(),
  template: CaseTemplateSchema.nullable().optional(),
  [CASE_EXTENDED_FIELDS]: z.record(z.string(), z.string()).optional(),
});

export const CaseRequestFieldsSchema = CaseBaseOptionalFieldsRequestSchema.extend({
  status: CaseStatusSchema.optional(),
  owner: z.string().optional(),
});

/**
 * Create case
 */
export const CasePostRequestSchema = z.object({
  description: limitedStringSchema({
    fieldName: 'description',
    min: 1,
    max: MAX_DESCRIPTION_LENGTH,
  }),
  tags: limitedArraySchema({
    codec: limitedStringSchema({ fieldName: 'tag', min: 1, max: MAX_LENGTH_PER_TAG }),
    fieldName: 'tags',
    min: 0,
    max: MAX_TAGS_PER_CASE,
  }),
  title: limitedStringSchema({ fieldName: 'title', min: 1, max: MAX_TITLE_LENGTH }),
  connector: CaseConnectorSchema,
  settings: CaseSettingsSchema,
  owner: z.string(),
  assignees: limitedArraySchema({
    codec: CaseUserProfileSchema,
    fieldName: 'assignees',
    min: 0,
    max: MAX_ASSIGNEES_PER_CASE,
  }).optional(),
  severity: CaseSeveritySchema.optional(),
  category: z
    .union([
      limitedStringSchema({ fieldName: 'category', min: 1, max: MAX_CATEGORY_LENGTH }),
      z.null(),
    ])
    .optional(),
  customFields: CaseRequestCustomFieldsSchema.optional(),
  template: CaseTemplateSchema.nullable().optional(),
  [CASE_EXTENDED_FIELDS]: z.record(z.string(), z.string()).optional(),
});

/**
 * Bulk create cases
 */

const CaseCreateRequestWithOptionalIdSchema = CasePostRequestSchema.extend({
  id: z.string().optional(),
});

export const BulkCreateCasesRequestSchema = z.object({
  cases: z.array(CaseCreateRequestWithOptionalIdSchema),
});

export const BulkCreateCasesResponseSchema = z.object({
  cases: z.array(CaseSchema),
});

/**
 * Find cases
 */

const CasesFindRequestSearchFieldsValues = ['description', 'title', 'incremental_id.text'] as const;
const CasesFindRequestSortFieldsValues = [
  'title',
  'category',
  'createdAt',
  'updatedAt',
  'closedAt',
  'status',
  'severity',
] as const;

export const CasesFindRequestSearchFieldsSchema = z.enum(CasesFindRequestSearchFieldsValues);
export const CasesFindRequestSortFieldsSchema = z.enum(CasesFindRequestSortFieldsValues);

const CasesFindRequestBaseFieldsSchema = paginationSchema({
  maxPerPage: MAX_CASES_PER_PAGE,
}).extend({
  tags: z
    .union([
      limitedArraySchema({
        codec: z.string(),
        fieldName: 'tags',
        min: 0,
        max: MAX_TAGS_FILTER_LENGTH,
      }),
      z.string(),
    ])
    .optional(),
  status: z.union([CaseStatusSchema, z.array(CaseStatusSchema)]).optional(),
  severity: z.union([CaseSeveritySchema, z.array(CaseSeveritySchema)]).optional(),
  assignees: z
    .union([
      limitedArraySchema({
        codec: z.string(),
        fieldName: 'assignees',
        min: 0,
        max: MAX_ASSIGNEES_FILTER_LENGTH,
      }),
      z.string(),
    ])
    .optional(),
  reporters: z
    .union([
      limitedArraySchema({
        codec: z.string(),
        fieldName: 'reporters',
        min: 0,
        max: MAX_REPORTERS_FILTER_LENGTH,
      }),
      z.string(),
    ])
    .optional(),
  defaultSearchOperator: z.enum(['AND', 'OR']).optional(),
  from: z.string().optional(),
  search: z.string().optional(),
  sortField: CasesFindRequestSortFieldsSchema.optional(),
  sortOrder: z.enum(['desc', 'asc']).optional(),
  to: z.string().optional(),
  owner: z.union([z.array(z.string()), z.string()]).optional(),
  category: z
    .union([
      limitedArraySchema({
        codec: z.string(),
        fieldName: 'category',
        min: 0,
        max: MAX_CATEGORY_FILTER_LENGTH,
      }),
      z.string(),
    ])
    .optional(),
});

export const CasesFindRequestSchema = CasesFindRequestBaseFieldsSchema.extend({
  searchFields: z
    .union([z.array(CasesFindRequestSearchFieldsSchema), CasesFindRequestSearchFieldsSchema])
    .optional(),
});

const CasesSearchRequestSearchFieldsValues = [
  'cases.description',
  'cases.title',
  'cases.incremental_id.text',
  'cases.observables.value',
  'cases.customFields.value',
  'cases-comments.comment',
  'cases-comments.alertId',
  'cases-comments.eventId',
] as const;

export const CasesSearchRequestSearchFieldsSchema = z.enum(CasesSearchRequestSearchFieldsValues);

export const CasesSearchRequestSchema = CasesFindRequestBaseFieldsSchema.extend({
  customFields: z
    .record(z.string(), z.array(z.union([z.string(), z.boolean(), z.number(), z.null()])))
    .optional(),
  searchFields: z
    .union([z.array(CasesSearchRequestSearchFieldsSchema), CasesSearchRequestSearchFieldsSchema])
    .optional(),
});

export const CasesFindRequestWithCustomFieldsSchema = CasesFindRequestSchema.extend({
  customFields: z
    .record(z.string(), z.array(z.union([z.string(), z.boolean(), z.number(), z.null()])))
    .optional(),
});

export const CasesFindResponseSchema = CasesStatusResponseSchema.extend({
  cases: z.array(CaseSchema),
  page: z.number(),
  per_page: z.number(),
  total: z.number(),
});

export const CasesSimilarResponseSchema = z.object({
  cases: z.array(SimilarCaseSchema),
  page: z.number(),
  per_page: z.number(),
  total: z.number(),
});

/**
 * Delete cases
 */

export const CasesDeleteRequestSchema = limitedArraySchema({
  codec: NonEmptyString,
  min: 1,
  max: MAX_DELETE_IDS_LENGTH,
  fieldName: 'ids',
});

/**
 * Resolve case
 */

export const CaseResolveResponseSchema = z.object({
  case: CaseSchema,
  outcome: z.enum(['exactMatch', 'aliasMatch', 'conflict']),
  alias_target_id: z.string().optional(),
  alias_purpose: z.enum(['savedObjectConversion', 'savedObjectImport']).optional(),
});

/**
 * Get cases
 */

export const CasesBulkGetRequestSchema = z.object({
  ids: limitedArraySchema({ codec: z.string(), min: 1, max: MAX_BULK_GET_CASES, fieldName: 'ids' }),
});

export const CasesBulkGetResponseSchema = z.object({
  cases: CasesSchema,
  errors: z.array(
    z.object({
      error: z.string(),
      message: z.string(),
      status: z.number().optional(),
      caseId: z.string(),
    })
  ),
});

/**
 * Update cases
 */

export const CasePatchRequestSchema = CaseRequestFieldsSchema.extend({
  id: z.string(),
  version: z.string(),
});

export const CasesPatchRequestSchema = z.object({
  cases: limitedArraySchema({
    codec: CasePatchRequestSchema,
    min: 1,
    max: MAX_CASES_TO_UPDATE,
    fieldName: 'cases',
  }),
});

/**
 * Push case
 */

export const CasePushRequestParamsSchema = z.object({
  case_id: z.string(),
  connector_id: z.string(),
});

/**
 * Taxonomies
 */

export const AllTagsFindRequestSchema = z.object({
  owner: z.union([z.array(z.string()), z.string()]).optional(),
});

export const AllCategoriesFindRequestSchema = AllTagsFindRequestSchema;
export const AllReportersFindRequestSchema = AllTagsFindRequestSchema;

export const GetTagsResponseSchema = z.array(z.string());
export const GetCategoriesResponseSchema = z.array(z.string());
export const GetReportersResponseSchema = z.array(UserSchema);

/**
 * Alerts
 */

export const CasesByAlertIDRequestSchema = z.object({
  owner: z.union([z.array(z.string()), z.string()]).optional(),
});

export const GetRelatedCasesByAlertResponseSchema = z.array(RelatedCaseSchema);

export const SimilarCasesSearchRequestSchema = paginationSchema({ maxPerPage: MAX_CASES_PER_PAGE });

export const FindCasesContainingAllDocumentsRequestSchema = z.object({
  documentIds: z.array(z.string()).optional(),
  alertIds: z.array(z.string()).optional(),
  caseIds: z.array(z.string()),
});

export const FindCasesContainingAllAlertsResponseSchema = z.object({
  casesWithAllAttachments: z.array(z.string()),
});

export type CasePostRequest = z.infer<typeof CasePostRequestSchema>;
export type CaseResolveResponse = z.infer<typeof CaseResolveResponseSchema>;
export type CasesDeleteRequest = z.infer<typeof CasesDeleteRequestSchema>;
export type CasesByAlertIDRequest = z.infer<typeof CasesByAlertIDRequestSchema>;
export type CasesFindRequest = z.infer<typeof CasesFindRequestSchema>;
export type CasesFindResponse = z.infer<typeof CasesFindResponseSchema>;
export type CasePatchRequest = z.infer<typeof CasePatchRequestSchema>;
export type CasesPatchRequest = z.infer<typeof CasesPatchRequestSchema>;
export type GetTagsResponse = z.infer<typeof GetTagsResponseSchema>;
export type GetCategoriesResponse = z.infer<typeof GetCategoriesResponseSchema>;
export type GetReportersResponse = z.infer<typeof GetReportersResponseSchema>;
export type CasesBulkGetRequest = z.infer<typeof CasesBulkGetRequestSchema>;
export type CasesBulkGetResponse = z.infer<typeof CasesBulkGetResponseSchema>;
export type BulkCreateCasesRequest = z.infer<typeof BulkCreateCasesRequestSchema>;
export type BulkCreateCasesResponse = z.infer<typeof BulkCreateCasesResponseSchema>;
