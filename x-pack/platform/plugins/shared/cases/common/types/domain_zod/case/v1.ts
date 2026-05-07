/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { CaseStatuses } from '@kbn/cases-components/src/status/types';
import {
  CaseSeverity as BundledCaseSeveritySchema,
  CaseStatus as BundledCaseStatusSchema,
  Settings,
} from '../../../bundled-types.gen';
import { CASE_EXTENDED_FIELDS } from '../../../constants';
import { ExternalServiceSchema } from '../external_service/v1';
import { CaseAssigneesSchema, UserSchema } from '../user/v1';
import { CaseConnectorSchema } from '../connector/v1';
import { AttachmentSchemaV2 } from '../attachment/v2';
import { CaseCustomFieldsSchema } from '../custom_field/v1';
import { CaseObservableSchema } from '../observable/v1';
import { CaseSeverity } from '../../domain/case/v1';

export { CaseStatuses, CaseSeverity };

/**
 * Status
 */
export const CaseStatusSchema = BundledCaseStatusSchema;

export const caseStatuses = Object.values(CaseStatuses);

/**
 * Severity
 */
export const CaseSeveritySchema = BundledCaseSeveritySchema;

/**
 * Case
 */
export const CaseSettingsSchema = Settings;

export const CaseTemplateSchema = z.object({
  id: z.string(),
  version: z.number(),
});

const CaseBaseFields = {
  description: z.string(),
  tags: z.array(z.string()),
  title: z.string(),
  connector: CaseConnectorSchema,
  severity: CaseSeveritySchema,
  assignees: CaseAssigneesSchema,
  category: z.string().nullable(),
  customFields: CaseCustomFieldsSchema,
  settings: CaseSettingsSchema,
  observables: z.array(CaseObservableSchema),
};

export const CaseBaseOptionalFieldsSchema = z.object({
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  title: z.string().optional(),
  connector: CaseConnectorSchema.optional(),
  severity: CaseSeveritySchema.optional(),
  assignees: CaseAssigneesSchema.optional(),
  category: z.string().nullable().optional(),
  customFields: CaseCustomFieldsSchema.optional(),
  settings: CaseSettingsSchema.optional(),
  observables: z.array(CaseObservableSchema).optional(),
});

const CaseBasicSchema = z.object({
  status: CaseStatusSchema,
  owner: z.string(),
  ...CaseBaseFields,
});

export const CaseAttributesSchema = CaseBasicSchema.extend({
  duration: z.number().nullable(),
  closed_at: z.string().nullable(),
  closed_by: UserSchema.nullable(),
  created_at: z.string(),
  created_by: UserSchema,
  external_service: ExternalServiceSchema.nullable(),
  updated_at: z.string().nullable(),
  updated_by: UserSchema.nullable(),
  total_observables: z.number().nullable(),
  incremental_id: z.number().nullable().optional(),
  in_progress_at: z.string().nullable().optional(),
  time_to_acknowledge: z.number().nullable().optional(),
  time_to_investigate: z.number().nullable().optional(),
  time_to_resolve: z.number().nullable().optional(),
  template: CaseTemplateSchema.nullable().optional(),
  [CASE_EXTENDED_FIELDS]: z.record(z.string(), z.string()).optional(),
});

export const CaseSchema = CaseAttributesSchema.extend({
  id: z.string(),
  totalComment: z.number(),
  totalAlerts: z.number(),
  totalEvents: z.number().optional(),
  version: z.string(),
  comments: z.array(AttachmentSchemaV2).optional(),
});

export const CasesSchema = z.array(CaseSchema);

export const AttachmentTotalsSchema = z.object({
  alerts: z.number(),
  events: z.number(),
  userComments: z.number(),
});

export const RelatedCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: CaseStatusSchema,
  createdAt: z.string(),
  totals: AttachmentTotalsSchema,
});

export const SimilaritySchema = z.object({
  typeKey: z.string(),
  typeLabel: z.string(),
  value: z.string(),
});

export const SimilarCaseSchema = CaseSchema.extend({
  similarities: z.object({ observables: z.array(SimilaritySchema) }),
});

export type Case = z.infer<typeof CaseSchema>;
export type Cases = z.infer<typeof CasesSchema>;
export type CaseAttributes = z.infer<typeof CaseAttributesSchema>;
export type CaseSettings = z.infer<typeof CaseSettingsSchema>;
export type RelatedCase = z.infer<typeof RelatedCaseSchema>;
export type AttachmentTotals = z.infer<typeof AttachmentTotalsSchema>;
export type CaseBaseOptionalFields = z.infer<typeof CaseBaseOptionalFieldsSchema>;
export type SimilarCase = z.infer<typeof SimilarCaseSchema>;
export type SimilarCases = SimilarCase[];
