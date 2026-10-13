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
} from '../../../../domain/resolution/rules/custom';

const name = () => z.string().min(1).max(MAX_CUSTOM_RULE_NAME_LENGTH);
const namespaces = () =>
  z
    .array(z.string().min(1).max(MAX_CUSTOM_RULE_NAMESPACE_LENGTH))
    .min(1)
    .max(MAX_CUSTOM_RULE_NAMESPACES)
    .describe('`entity.namespace` values the rule considers, e.g. `local`, `active_directory`.');
const expression = () => z.string().min(1).max(MAX_CUSTOM_RULE_EXPRESSION_LENGTH);

export const customRuleIdParamsSchema = lazySchema(() =>
  z.object({ id: z.string().min(1).max(MAX_CUSTOM_RULE_ID_LENGTH) })
);

export const customRulePreviewBodySchema = lazySchema(() =>
  z.object({
    namespaces: namespaces(),
    filter: expression().optional().describe('ES|QL boolean expression evaluated per entity.'),
    match_value: expression().describe('ES|QL expression that computes the key to group by.'),
    decline_same_namespace_duplicates: z.boolean().optional(),
  })
);

export const customRuleCreateBodySchema = lazySchema(() =>
  z.object({
    name: name(),
    namespaces: namespaces(),
    filter: expression().optional(),
    match_value: expression(),
    decline_same_namespace_duplicates: z.boolean().optional(),
    enabled: z.boolean().optional(),
  })
);

export const customRuleUpdateBodySchema = lazySchema(() =>
  z
    .object({
      name: name().optional(),
      namespaces: namespaces().optional(),
      filter: expression().nullable().optional().describe('`null` removes the filter.'),
      match_value: expression().optional(),
      decline_same_namespace_duplicates: z.boolean().optional(),
      enabled: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field' })
);
