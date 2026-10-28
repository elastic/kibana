/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  MAX_CUSTOM_RULE_EXPRESSION_LENGTH,
  MAX_CUSTOM_RULE_ID_LENGTH,
  MAX_CUSTOM_RULE_NAME_LENGTH,
  MAX_CUSTOM_RULE_NAMESPACES,
  MAX_CUSTOM_RULE_NAMESPACE_LENGTH,
} from './constants';

const expression = () => z.string().min(1).max(MAX_CUSTOM_RULE_EXPRESSION_LENGTH);

export const CustomResolutionRuleCreate = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(MAX_CUSTOM_RULE_NAME_LENGTH),
    namespaces: z
      .array(z.string().min(1).max(MAX_CUSTOM_RULE_NAMESPACE_LENGTH))
      .min(1)
      .max(MAX_CUSTOM_RULE_NAMESPACES)
      .describe('`entity.namespace` values the rule considers, e.g. `local`, `active_directory`.'),
    filter: expression().optional().describe('ES|QL boolean expression evaluated per entity.'),
    match_value: expression().describe('ES|QL expression that computes the key to group by.'),
    decline_same_namespace_duplicates: z
      .boolean()
      .optional()
      .describe(
        'Default true: skip a group when two non-local entities share a namespace. Set false when duplicates are identifier drift, not distinct accounts.'
      ),
    enabled: z.boolean().optional().describe('Default false.'),
  })
);
export type CustomResolutionRuleCreate = z.infer<typeof CustomResolutionRuleCreate>;

export const CustomResolutionRulePreviewRequest = lazySchema(() =>
  CustomResolutionRuleCreate.omit({ name: true, enabled: true })
);
export type CustomResolutionRulePreviewRequest = z.infer<typeof CustomResolutionRulePreviewRequest>;

export const CustomResolutionRuleUpdate = lazySchema(() =>
  CustomResolutionRuleCreate.partial()
    .extend({ filter: expression().nullable().optional().describe('`null` removes the filter.') })
    .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field' })
);
export type CustomResolutionRuleUpdate = z.infer<typeof CustomResolutionRuleUpdate>;

export const CustomResolutionRuleIdParams = lazySchema(() =>
  z.object({ id: z.string().min(1).max(MAX_CUSTOM_RULE_ID_LENGTH) })
);
