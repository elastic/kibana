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
  MAX_CUSTOM_FIELD_KEY_LENGTH,
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
} from '../../../schema';
import {
  CaseCustomFieldToggleSchema,
  CustomFieldTextTypeSchema,
  CustomFieldNumberTypeSchema,
} from '../../domain/custom_field/v1';
import {
  CaseCloseReasonSchema,
  CaseSchema,
  CasesSchema,
  CaseSettingsSchema,
  CaseSeveritySchema,
  CaseStatusSchema,
  CaseTemplateSchema,
  RelatedCaseSchema,
  SimilarCaseSchema,
} from '../../domain/case/v1';
import { CaseConnectorSchema } from '../../domain/connector/v1';
import { CaseUserProfileSchema, UserSchema } from '../../domain/user/v1';
import { CasesStatusResponseSchema } from '../stats/v1';
import {
  CaseCustomFieldTextWithValidationValueSchema,
  CaseCustomFieldNumberWithValidationValueSchema,
} from '../custom_field/v1';

const CaseCustomFieldTextWithValidationSchema = z.object({
  key: z.string().max(MAX_CUSTOM_FIELD_KEY_LENGTH),
  type: CustomFieldTextTypeSchema,
  value: z.union([CaseCustomFieldTextWithValidationValueSchema('value'), z.null()]),
});

const CaseCustomFieldNumberWithValidationSchema = z.object({
  key: z.string().max(MAX_CUSTOM_FIELD_KEY_LENGTH),
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
  /**
   * The description of the case
   */
  description: limitedStringSchema({
    fieldName: 'description',
    min: 1,
    max: MAX_DESCRIPTION_LENGTH,
  }).optional(),
  /**
   * The identifying strings for filter a case
   */
  tags: limitedArraySchema({
    codec: limitedStringSchema({ fieldName: 'tag', min: 1, max: MAX_LENGTH_PER_TAG }),
    min: 0,
    max: MAX_TAGS_PER_CASE,
    fieldName: 'tags',
  }).optional(),
  /**
   * The title of a case
   */
  title: limitedStringSchema({ fieldName: 'title', min: 1, max: MAX_TITLE_LENGTH }).optional(),
  /**
   * The external system that the case can be synced with
   */
  connector: CaseConnectorSchema.optional(),
  /**
   * The severity of the case
   */
  severity: CaseSeveritySchema.optional(),
  /**
   * The users assigned to this case
   */
  assignees: limitedArraySchema({
    codec: CaseUserProfileSchema,
    fieldName: 'assignees',
    min: 0,
    max: MAX_ASSIGNEES_PER_CASE,
  }).optional(),
  /**
   * The category of the case.
   */
  category: z
    .union([
      limitedStringSchema({ fieldName: 'category', min: 1, max: MAX_CATEGORY_LENGTH }),
      z.null(),
    ])
    .optional(),
  /**
   * Custom fields of the case
   */
  customFields: CaseRequestCustomFieldsSchema.optional(),
  /**
   * The alert sync settings
   */
  settings: CaseSettingsSchema.optional(),
  template: CaseTemplateSchema.nullable().optional(),
  [CASE_EXTENDED_FIELDS]: z
    .record(z.string().max(1000), z.string().max(MAX_DESCRIPTION_LENGTH))
    .optional(),
  /**
   * The close reason to sync to attached alerts
   */
  closeReason: CaseCloseReasonSchema.optional(),
});

export const CaseRequestFieldsSchema = CaseBaseOptionalFieldsRequestSchema.extend({
  /**
   * The current status of the case (open, closed, in-progress)
   */
  status: CaseStatusSchema.optional(),
  /**
   * The plugin owner of the case
   */
  owner: z.string().max(MAX_TITLE_LENGTH).optional(),
});

/**
 * Create case
 */
export const CasePostRequestSchema = z.object({
  /**
   * Description of the case
   */
  description: limitedStringSchema({
    fieldName: 'description',
    min: 1,
    max: MAX_DESCRIPTION_LENGTH,
  }),
  /**
   * Identifiers for the case.
   */
  tags: limitedArraySchema({
    codec: limitedStringSchema({ fieldName: 'tag', min: 1, max: MAX_LENGTH_PER_TAG }),
    fieldName: 'tags',
    min: 0,
    max: MAX_TAGS_PER_CASE,
  }),
  /**
   * Title of the case
   */
  title: limitedStringSchema({ fieldName: 'title', min: 1, max: MAX_TITLE_LENGTH }),
  /**
   * The external configuration for the case
   */
  connector: CaseConnectorSchema,
  /**
   * Sync settings for alerts
   */
  settings: CaseSettingsSchema,
  /**
   * The owner here must match the string used when a plugin registers a feature with access to the cases plugin. The user
   * creating this case must also be granted access to that plugin's feature.
   */
  owner: z.string().max(MAX_TITLE_LENGTH),
  /**
   * The users assigned to the case
   */
  assignees: limitedArraySchema({
    codec: CaseUserProfileSchema,
    fieldName: 'assignees',
    min: 0,
    max: MAX_ASSIGNEES_PER_CASE,
  }).optional(),
  /**
   * The severity of the case. The severity is
   * default it to "low" if not provided.
   */
  severity: CaseSeveritySchema.optional(),
  /**
   * The category of the case.
   */
  category: z
    .union([
      limitedStringSchema({ fieldName: 'category', min: 1, max: MAX_CATEGORY_LENGTH }),
      z.null(),
    ])
    .optional(),
  /**
   * The list of custom field values of the case.
   */
  customFields: CaseRequestCustomFieldsSchema.optional(),
  template: CaseTemplateSchema.nullable().optional(),
  [CASE_EXTENDED_FIELDS]: z
    .record(z.string().max(1000), z.string().max(MAX_DESCRIPTION_LENGTH))
    .optional(),
});

/**
 * Bulk create cases
 */

const CaseCreateRequestWithOptionalIdSchema = CasePostRequestSchema.extend({
  id: z.string().max(512).optional(),
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
  /**
   * Tags to filter by
   */
  tags: z
    .union([
      limitedArraySchema({
        codec: z.string().max(MAX_LENGTH_PER_TAG),
        fieldName: 'tags',
        min: 0,
        max: MAX_TAGS_FILTER_LENGTH,
      }),
      z.string().max(MAX_LENGTH_PER_TAG),
    ])
    .optional(),
  /**
   * The status of the case (open, closed, in-progress)
   */
  status: z.union([CaseStatusSchema, z.array(CaseStatusSchema)]).optional(),
  /**
   * The severity of the case
   */
  severity: z.union([CaseSeveritySchema, z.array(CaseSeveritySchema)]).optional(),
  /**
   * The uids of the user profiles to filter by
   */
  assignees: z
    .union([
      limitedArraySchema({
        codec: z.string().max(512),
        fieldName: 'assignees',
        min: 0,
        max: MAX_ASSIGNEES_FILTER_LENGTH,
      }),
      z.string().max(512),
    ])
    .optional(),
  /**
   * The reporters to filter by
   */
  reporters: z
    .union([
      limitedArraySchema({
        codec: z.string().max(512),
        fieldName: 'reporters',
        min: 0,
        max: MAX_REPORTERS_FILTER_LENGTH,
      }),
      z.string().max(512),
    ])
    .optional(),
  /**
   * Operator to use for the `search` field
   */
  defaultSearchOperator: z.enum(['AND', 'OR']).optional(),
  /**
   * A KQL date. If used all cases created after (gte) the from date will be returned
   */
  from: z.string().max(50).optional(),
  /**
   * An Elasticsearch simple_query_string
   */
  search: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  /**
   * The field to use for sorting the found objects.
   *
   */
  sortField: CasesFindRequestSortFieldsSchema.optional(),
  /**
   * The order to sort by
   */
  sortOrder: z.enum(['desc', 'asc']).optional(),
  /**
   * A KQL date. If used all cases created before (lte) the to date will be returned.
   */
  to: z.string().max(50).optional(),
  /**
   * The owner(s) to filter by. The user making the request must have privileges to retrieve cases of that
   * ownership or they will be ignored. If no owner is included, then all ownership types will be included in the response
   * that the user has access to.
   */
  owner: z
    .union([z.array(z.string().max(MAX_TITLE_LENGTH)), z.string().max(MAX_TITLE_LENGTH)])
    .optional(),
  /**
   * The category of the case.
   */
  category: z
    .union([
      limitedArraySchema({
        codec: z.string().max(MAX_CATEGORY_LENGTH),
        fieldName: 'category',
        min: 0,
        max: MAX_CATEGORY_FILTER_LENGTH,
      }),
      z.string().max(MAX_CATEGORY_LENGTH),
    ])
    .optional(),
});

export const CasesFindRequestSchema = CasesFindRequestBaseFieldsSchema.extend({
  /**
   * The fields to perform the simple_query_string parsed query against
   */
  searchFields: z
    .union([z.array(CasesFindRequestSearchFieldsSchema), CasesFindRequestSearchFieldsSchema])
    .optional(),
});

/**
 * search cases
 */

const CasesSearchRequestSearchFieldsValues = [
  'cases.description',
  'cases.title',
  'cases.incremental_id.text',
  'cases.observables.value',
  'cases.customFields.value',
  'cases-comments.comment',
  'cases-comments.alertId',
  'cases-comments.eventId',
  'cases.ef_all_values',
] as const;

export const CasesSearchRequestSearchFieldsSchema = z.enum(CasesSearchRequestSearchFieldsValues);

const ExtendedFieldFilterSchema = z.object({
  label: z.string().max(MAX_TITLE_LENGTH),
  value: z.string().max(MAX_DESCRIPTION_LENGTH),
});

export const CasesSearchRequestSchema = CasesFindRequestBaseFieldsSchema.extend({
  /**
   * custom fields of the case
   */
  customFields: z
    .record(
      z.string().max(MAX_CUSTOM_FIELD_KEY_LENGTH),
      z.array(z.union([z.string().max(MAX_DESCRIPTION_LENGTH), z.boolean(), z.number(), z.null()]))
    )
    .optional(),
  /**
   * The fields to perform the simple_query_string parsed query against.
   */
  searchFields: z
    .union([z.array(CasesSearchRequestSearchFieldsSchema), CasesSearchRequestSearchFieldsSchema])
    .optional(),
  /**
   * Extended field filters parsed from label:value syntax in the search bar.
   */
  extendedFieldFilters: z.array(ExtendedFieldFilterSchema).optional(),
});

export const CasesFindRequestWithCustomFieldsSchema = CasesFindRequestSchema.extend({
  /**
   * custom fields of the case
   */
  customFields: z
    .record(
      z.string().max(MAX_CUSTOM_FIELD_KEY_LENGTH),
      z.array(z.union([z.string().max(MAX_DESCRIPTION_LENGTH), z.boolean(), z.number(), z.null()]))
    )
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
  alias_target_id: z.string().max(512).optional(),
  alias_purpose: z.enum(['savedObjectConversion', 'savedObjectImport']).optional(),
});

/**
 * Get cases
 */

export const CasesBulkGetRequestSchema = z.object({
  ids: limitedArraySchema({
    codec: z.string().max(512),
    min: 1,
    max: MAX_BULK_GET_CASES,
    fieldName: 'ids',
  }),
});

export const CasesBulkGetResponseSchema = z.object({
  cases: CasesSchema,
  errors: z.array(
    z.object({
      error: z.string().max(32000),
      message: z.string().max(32000),
      status: z.number().optional(),
      caseId: z.string().max(512),
    })
  ),
});

/**
 * Update cases
 */

/**
 * The saved object ID and version
 */
export const CasePatchRequestSchema = CaseRequestFieldsSchema.extend({
  id: z.string().max(512),
  version: z.string().max(512),
});

export const CasesPatchRequestSchema = z.object({
  cases: limitedArraySchema({
    codec: CasePatchRequestSchema,
    min: 1,
    max: MAX_CASES_TO_UPDATE,
    fieldName: 'cases',
  }),
});

export const UpdateSummarySchema = z.object({
  syncedAlertCount: z.number(),
});

export const CaseWithUpdateSummarySchema = CaseSchema.extend({
  updateSummary: UpdateSummarySchema.optional(),
});

export const PatchCasesResponseSchema = z.array(CaseWithUpdateSummarySchema);

/**
 * Push case
 */

export const CasePushRequestParamsSchema = z.object({
  case_id: z.string().max(512),
  connector_id: z.string().max(512),
});

/**
 * Taxonomies
 */

export const AllTagsFindRequestSchema = z.object({
  /**
   * The owner of the cases to retrieve the tags from. If no owner is provided the tags from all cases
   * that the user has access to will be returned.
   */
  owner: z
    .union([z.array(z.string().max(MAX_TITLE_LENGTH)), z.string().max(MAX_TITLE_LENGTH)])
    .optional(),
});

export const AllCategoriesFindRequestSchema = AllTagsFindRequestSchema;
export const AllReportersFindRequestSchema = AllTagsFindRequestSchema;

export const GetTagsResponseSchema = z.array(z.string().max(MAX_LENGTH_PER_TAG));
export const GetCategoriesResponseSchema = z.array(z.string().max(MAX_CATEGORY_LENGTH));
export const GetReportersResponseSchema = z.array(UserSchema);

/**
 * Alerts
 */

export const CasesByAlertIDRequestSchema = z.object({
  /**
   * The type of cases to retrieve given an alert ID. If no owner is provided, all cases
   * that the user has access to will be returned.
   */
  owner: z
    .union([z.array(z.string().max(MAX_TITLE_LENGTH)), z.string().max(MAX_TITLE_LENGTH)])
    .optional(),
});

export const GetRelatedCasesByAlertResponseSchema = z.array(RelatedCaseSchema);

export const SimilarCasesSearchRequestSchema = paginationSchema({ maxPerPage: MAX_CASES_PER_PAGE });

export const FindCasesContainingAllDocumentsRequestSchema = z.object({
  /**
   * The IDs of the documents to find cases for.
   */
  documentIds: z.array(z.string().max(512)).optional(),
  /**
   * The IDs of the alerts to find cases for. TODO: remove this in the next serverless release cycle https://github.com/elastic/security-team/issues/14718
   */
  alertIds: z.array(z.string().max(512)).optional(),
  // The IDs of the cases to find alerts for.
  caseIds: z.array(z.string().max(512)),
});

export const FindCasesContainingAllAlertsResponseSchema = z.object({
  casesWithAllAttachments: z.array(z.string().max(512)),
});

export type CasePostRequest = z.infer<typeof CasePostRequestSchema>;
export type CaseResolveResponse = z.infer<typeof CaseResolveResponseSchema>;
export type CasesDeleteRequest = z.infer<typeof CasesDeleteRequestSchema>;
export type CasesByAlertIDRequest = z.infer<typeof CasesByAlertIDRequestSchema>;
export type CasesFindRequest = z.infer<typeof CasesFindRequestSchema>;
export type CasesFindResponse = z.infer<typeof CasesFindResponseSchema>;
export type CasePatchRequest = z.infer<typeof CasePatchRequestSchema>;
export type CasesPatchRequest = z.infer<typeof CasesPatchRequestSchema>;
export type UpdateSummary = z.infer<typeof UpdateSummarySchema>;
export type CaseWithUpdateSummary = z.infer<typeof CaseWithUpdateSummarySchema>;
export type CasesPatchResponse = z.infer<typeof PatchCasesResponseSchema>;
export type GetTagsResponse = z.infer<typeof GetTagsResponseSchema>;
export type GetCategoriesResponse = z.infer<typeof GetCategoriesResponseSchema>;
export type GetReportersResponse = z.infer<typeof GetReportersResponseSchema>;
export type CasesBulkGetRequest = z.infer<typeof CasesBulkGetRequestSchema>;
export type CasesBulkGetResponse = z.infer<typeof CasesBulkGetResponseSchema>;
export type BulkCreateCasesRequest = z.infer<typeof BulkCreateCasesRequestSchema>;
export type BulkCreateCasesResponse = z.infer<typeof BulkCreateCasesResponseSchema>;
export type CasesFindRequestSortFields = z.infer<typeof CasesFindRequestSortFieldsSchema>;
export type CasesFindRequestWithCustomFields = z.infer<
  typeof CasesFindRequestWithCustomFieldsSchema
>;
export type CasesSearchRequest = z.infer<typeof CasesSearchRequestSchema>;
export type AllTagsFindRequest = z.infer<typeof AllTagsFindRequestSchema>;
export type AllCategoriesFindRequest = z.infer<typeof AllCategoriesFindRequestSchema>;
export type AllReportersFindRequest = AllTagsFindRequest;
export type GetRelatedCasesByAlertResponse = z.infer<typeof GetRelatedCasesByAlertResponseSchema>;
export type CaseRequestCustomFields = z.infer<typeof CaseRequestCustomFieldsSchema>;
export type CaseRequestCustomField = z.infer<typeof CustomFieldForRequestSchema>;
export type SimilarCasesSearchRequest = z.infer<typeof SimilarCasesSearchRequestSchema>;
export type CasesSimilarResponse = z.infer<typeof CasesSimilarResponseSchema>;
export type FindCasesContainingAllDocumentsRequest = z.infer<
  typeof FindCasesContainingAllDocumentsRequestSchema
>;
export type FindCasesContainingAllAlertsResponse = z.infer<
  typeof FindCasesContainingAllAlertsResponseSchema
>;
