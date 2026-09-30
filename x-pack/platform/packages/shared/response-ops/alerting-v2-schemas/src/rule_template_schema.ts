/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_TAG_LENGTH, MAX_TAGS } from '@kbn/alerting-v2-constants';
import { arrayOrSingleSchema, ESTIMATED_COUNT_NOTE, queryIntSchema } from './common';
import { createRuleDataSchema } from './rule_data_schema';
import {
  FIND_DEFAULT_PER_PAGE,
  FIND_MAX_RESULT_WINDOW,
  ID_MAX_LENGTH,
  MAX_SEARCH_LENGTH,
  RULE_TEMPLATE_MAX_PER_PAGE,
} from './constants';

const engineField = z
  .literal('v2')
  .describe('The alerting engine this template targets. Always "v2" for v2 templates.');

export const ruleTemplateDataSchema = z
  .object({
    engine: engineField,
    rule: createRuleDataSchema,
  })
  .strict()
  .describe('Alerting v2 rule template attributes.');

export type RuleTemplateData = z.infer<typeof ruleTemplateDataSchema>;

export const ruleTemplateResponseSchema = z
  .object({
    id: z.string().describe('The identifier for the rule template.'),
    engine: engineField,
    rule: createRuleDataSchema.describe(
      'Create-rule payload the template installs. Can be submitted to the create rule API as-is.'
    ),
  })
  .describe('An alerting v2 rule template.');

export type RuleTemplateResponse = z.infer<typeof ruleTemplateResponseSchema>;

export const findRuleTemplatesSortFieldSchema = z.enum(['name', 'tags']);
export type FindRuleTemplatesSortField = z.infer<typeof findRuleTemplatesSortFieldSchema>;

export const findRuleTemplatesRequestSchema = z
  .object({
    page: queryIntSchema({ min: 1, max: FIND_MAX_RESULT_WINDOW })
      .optional()
      .describe('The page number to return. Defaults to 1.'),
    per_page: queryIntSchema({ min: 1, max: RULE_TEMPLATE_MAX_PER_PAGE })
      .optional()
      .describe('The number of rule templates to return per page. Defaults to 20.'),
    search: z
      .string()
      .trim()
      .min(1)
      .max(MAX_SEARCH_LENGTH)
      .optional()
      .describe('A text string to search across rule template name and description.'),
    sort_field: findRuleTemplatesSortFieldSchema
      .optional()
      .describe('The field to sort rule templates by. Defaults to name.'),
    sort_order: z
      .enum(['asc', 'desc'])
      .optional()
      .describe('The direction to sort rule templates.'),
    tags: arrayOrSingleSchema(z.string().min(1).max(MAX_TAG_LENGTH), MAX_TAGS)
      .optional()
      .describe(
        'Only return templates carrying at least one of these tags. Accepts a single tag or a repeated parameter.'
      ),
  })
  .strict()
  .refine(
    ({ page = 1, per_page = FIND_DEFAULT_PER_PAGE }) => page * per_page <= FIND_MAX_RESULT_WINDOW,
    { message: `page * per_page cannot exceed ${FIND_MAX_RESULT_WINDOW}.`, path: ['page'] }
  );

export type FindRuleTemplatesRequest = z.infer<typeof findRuleTemplatesRequestSchema>;

export const findRuleTemplatesResponseSchema = z
  .object({
    items: z.array(ruleTemplateResponseSchema).describe('The list of rule templates.'),
    total: z
      .number()
      .describe(`The number of rule templates matching the query. ${ESTIMATED_COUNT_NOTE}`),
    page: z.number().describe('The current page number.'),
    per_page: z.number().describe('The number of rule templates per page.'),
  })
  .describe('Paginated list of rule templates.');

export type FindRuleTemplatesResponse = z.infer<typeof findRuleTemplatesResponseSchema>;

export const ruleTemplateIdParamsSchema = z
  .object({
    id: z.string().min(1).max(ID_MAX_LENGTH).describe('The identifier for the rule template.'),
  })
  .strict();

export type RuleTemplateIdParams = z.infer<typeof ruleTemplateIdParamsSchema>;
