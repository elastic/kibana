/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import {
  CaseCategories,
  CaseCategory,
  CaseResponseProperties as CaseResponsePropertiesSchema,
  CaseSeverity,
  CaseStatus,
  Owner,
  Owners,
  SearchFieldsType,
  SearchFieldsTypeArray,
  String,
  StringArray,
} from '../../bundled-types.gen';
import * as i18n from '../translations';
import { MAX_CASES_PER_PAGE, MAX_DOCS_PER_PAGE } from '../../constants';

export const FindCasesStepTypeId = 'cases.findCases';

const FindCasesSortFieldSchema = z.enum([
  'title',
  'category',
  'createdAt',
  'updatedAt',
  'closedAt',
  'status',
  'severity',
]);

const FindCasesDefaultSearchOperatorSchema = z.enum(['AND', 'OR']);
const FindCasesSearchFieldSchema = z.union([SearchFieldsType, z.literal('incremental_id.text')]);
const FindCasesSearchFieldArraySchema = z.union([
  SearchFieldsTypeArray,
  z.array(FindCasesSearchFieldSchema),
]);

const CustomFieldValueSchema = z.union([z.string(), z.boolean(), z.number(), z.null()]);

export const InputSchema = z.object({
  assignees: z.union([String, StringArray]).optional(),
  category: z.union([CaseCategory, CaseCategories]).optional(),
  customFields: z.record(z.string(), z.array(CustomFieldValueSchema)).optional(),
  defaultSearchOperator: FindCasesDefaultSearchOperatorSchema.optional(),
  from: z.string().optional(),
  owner: z.union([Owner, Owners]).optional(),
  page: z.number().int().positive().optional().default(1),
  perPage: z.number().int().positive().max(MAX_CASES_PER_PAGE).optional().default(20),
  reporters: z.union([String, StringArray]).optional(),
  search: z.string().optional(),
  searchFields: z.union([FindCasesSearchFieldSchema, FindCasesSearchFieldArraySchema]).optional(),
  severity: z.union([CaseSeverity, z.array(CaseSeverity)]).optional(),
  sortField: FindCasesSortFieldSchema.optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  status: z.union([CaseStatus, z.array(CaseStatus)]).optional(),
  tags: z.union([String, StringArray]).optional(),
  to: z.string().optional(),
});

export const OutputSchema = z.object({
  cases: z.array(CaseResponsePropertiesSchema).max(MAX_DOCS_PER_PAGE),
  count_closed_cases: z.number().int(),
  count_in_progress_cases: z.number().int(),
  count_open_cases: z.number().int(),
  page: z.number().int(),
  per_page: z.number().int(),
  total: z.number().int(),
});

type FindCasesStepInputSchema = typeof InputSchema;
type FindCasesStepOutputSchema = typeof OutputSchema;

export const findCasesStepCommonDefinition: CommonStepDefinition<
  FindCasesStepInputSchema,
  FindCasesStepOutputSchema
> = {
  id: FindCasesStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.FIND_CASES_STEP_LABEL,
  description: i18n.FIND_CASES_STEP_DESCRIPTION,
  documentation: {
    details: i18n.FIND_CASES_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Basic case search
\`\`\`yaml
- name: find_cases
  type: ${FindCasesStepTypeId}
  with:
    owner: "securitySolution"
    search: "critical incident"
\`\`\``,
      `## Filter and sort found cases
\`\`\`yaml
- name: find_open_cases
  type: ${FindCasesStepTypeId}
  with:
    owner: "securitySolution"
    status: "open"
    severity: ["high", "critical"]
    tags: ["investigation"]
    sortField: "updatedAt"
    sortOrder: "desc"
    page: 1
    perPage: 20
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
