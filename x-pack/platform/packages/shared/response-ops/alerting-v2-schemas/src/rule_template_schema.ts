/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_TAG_LENGTH, MAX_TAGS } from '@kbn/alerting-v2-constants';
import { arrayOrSingleSchema } from './common';
import { createRuleDataSchema } from './rule_data_schema';
import { ID_MAX_LENGTH, MAX_SEARCH_LENGTH } from './constants';

const engineField = z
  .literal('v2')
  .describe('The alerting engine this template targets. Always "v2" for v2 templates.');

/**
 * Alerting v2 rule template attributes.
 *
 * Create-rule fields are nested under `rule` so template storage can evolve
 * independently of top-level SO metadata (`engine`). Uses the full create-rule
 * schema (including cross-field refines), not only the base object shape.
 */
export const ruleTemplateDataSchema = z
  .object({
    engine: engineField,
    rule: createRuleDataSchema,
  })
  .strict()
  .describe('Alerting v2 rule template attributes.');

export type RuleTemplateData = z.infer<typeof ruleTemplateDataSchema>;

/**
 * A rule template as returned by the read APIs: the stored attributes plus the
 * saved-object `id`. Templates are installed by Fleet packages rather than
 * created through the API, so there is no created/updated audit metadata.
 */
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

/** Sort field for the find rule templates API. */
export const findRuleTemplatesSortFieldSchema = z.enum(['name', 'tags']);
export type FindRuleTemplatesSortField = z.infer<typeof findRuleTemplatesSortFieldSchema>;

/** Query parameters for the find rule templates (list) API. */
export const findRuleTemplatesRequestSchema = z.object({
  page: z.coerce.number().min(1).optional().describe('The page number to return. Defaults to 1.'),
  per_page: z.coerce
    .number()
    .min(1)
    .max(100)
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
  sort_order: z.enum(['asc', 'desc']).optional().describe('The direction to sort rule templates.'),
  tags: arrayOrSingleSchema(z.string().min(1).max(MAX_TAG_LENGTH), MAX_TAGS)
    .optional()
    .describe(
      'Only return templates carrying at least one of these tags. Accepts a single tag or a repeated parameter.'
    ),
});

export type FindRuleTemplatesRequest = z.infer<typeof findRuleTemplatesRequestSchema>;

/** Paginated list response for the find rule templates API. */
export const findRuleTemplatesResponseSchema = z
  .object({
    items: z.array(ruleTemplateResponseSchema).describe('The list of rule templates.'),
    total: z.number().describe('The total number of rule templates matching the query.'),
    page: z.number().describe('The current page number.'),
    perPage: z.number().describe('The number of rule templates per page.'),
  })
  .describe('Paginated list of rule templates.');

export type FindRuleTemplatesResponse = z.infer<typeof findRuleTemplatesResponseSchema>;

/** Path parameters for the single rule template API. */
export const ruleTemplateIdParamsSchema = z.object({
  id: z.string().min(1).max(ID_MAX_LENGTH).describe('The identifier for the rule template.'),
});

export type RuleTemplateIdParams = z.infer<typeof ruleTemplateIdParamsSchema>;

/** Query parameters for the rule template tags API. */
export const ruleTemplateTagsRequestSchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .max(MAX_TAG_LENGTH)
    .optional()
    .describe('Only return tags starting with this prefix.'),
});

export type RuleTemplateTagsRequest = z.infer<typeof ruleTemplateTagsRequestSchema>;

/** Rule template tags response schema. */
export const ruleTemplateTagsResponseSchema = z
  .object({
    tags: z.array(z.string()).describe('The list of unique rule template tags.'),
  })
  .describe('All unique tags across rule templates.');

export type RuleTemplateTagsResponse = z.infer<typeof ruleTemplateTagsResponseSchema>;
