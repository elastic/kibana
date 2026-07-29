/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_KQL_LENGTH } from './constants';
import { createRuleDataBaseSchema } from './rule_data_schema';

/**
 * Fields present on templates that are stripped when instantiating a rule.
 * Mapping lives in `@kbn/alerting-v2-plugin` (`createRuleDataFromTemplate`).
 */
export const RULE_TEMPLATE_ONLY_FIELDS = ['engine'] as const;

export type RuleTemplateOnlyField = (typeof RULE_TEMPLATE_ONLY_FIELDS)[number];

const engineField = z
  .literal('v2')
  .describe('The alerting engine this template targets. Always "v2" for v2 templates.');

/**
 * Rule template attributes: create-rule fields + `engine`.
 *
 * Derived from {@link createRuleDataBaseSchema}. Shape-only — no create-rule
 * cross-field refinements (those run in `createRuleDataFromTemplate`).
 * Tripwire tests enforce this coupling.
 */
export const ruleTemplateDataSchema = createRuleDataBaseSchema
  .extend({
    engine: engineField,
  })
  .strict()
  .describe('Alerting v2 rule template attributes.');

export type RuleTemplateData = z.infer<typeof ruleTemplateDataSchema>;

/**
 * Parses unknown input as the template data schema.
 */
export const parseRuleTemplateData = (input: unknown): RuleTemplateData =>
  ruleTemplateDataSchema.parse(input);

// ---------------------------------------------------------------------------
// Find rule templates route (alerting_v2 internal API)
// ---------------------------------------------------------------------------

/**
 * List item for the find rule templates route: template attributes + `id`.
 */
export const ruleTemplateListItemSchema = ruleTemplateDataSchema
  .extend({
    id: z.string().describe('The identifier for the rule template.'),
  })
  .describe('List item for alerting v2 rule templates (engine:v2).');

export type RuleTemplateListItem = z.infer<typeof ruleTemplateListItemSchema>;

/** Alias used by find route / library consumers. */
export type RuleTemplateResponse = RuleTemplateListItem;

/** Sort field for find rule templates API. */
export const findRuleTemplatesSortFieldSchema = z.enum(['name', 'tags']);
export type FindRuleTemplatesSortField = z.infer<typeof findRuleTemplatesSortFieldSchema>;

/** Query parameters for the find rule templates (list) API. */
export const findRuleTemplatesParamsSchema = z.object({
  page: z.coerce.number().min(1).optional().describe('The page number to return. Defaults to 1.'),
  perPage: z.coerce
    .number()
    .min(1)
    .max(1000)
    .optional()
    .describe('The number of rule templates to return per page. Defaults to 20.'),
  filter: z
    .string()
    .max(MAX_KQL_LENGTH)
    .optional()
    .describe('The filter to apply to the rule templates.'),
  sortField: findRuleTemplatesSortFieldSchema
    .optional()
    .describe('The field to sort rule templates by.'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('The direction to sort rule templates.'),
  search: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('A text string to search across rule template fields.'),
});

export type FindRuleTemplatesParams = z.infer<typeof findRuleTemplatesParamsSchema>;

/** Paginated list response for the find rule templates API. */
export const findRuleTemplatesResponseSchema = z
  .object({
    items: z.array(ruleTemplateListItemSchema).describe('The list of rule templates (engine:v2).'),
    total: z.number().describe('The total number of rule templates matching the query.'),
    page: z.number().describe('The current page number.'),
    perPage: z.number().describe('The number of rule templates per page.'),
  })
  .describe('Paginated list of alerting v2 rule templates.');

export type FindRuleTemplatesResponse = z.infer<typeof findRuleTemplatesResponseSchema>;
