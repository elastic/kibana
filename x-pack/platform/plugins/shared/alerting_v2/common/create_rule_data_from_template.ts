/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createRuleDataSchema,
  type CreateRuleData,
  type RuleTemplateData,
} from '@kbn/alerting-v2-schemas';

/**
 * Convert a v2 rule template into create-rule data.
 *
 * Re-parses `template.rule` even though {@link RuleTemplateData} already types it:
 * Fleet/SO storage only keeps an opaque bag, so runtime Zod validation here is the
 * safety boundary before rule creation.
 */
export const createRuleDataFromTemplate = (template: RuleTemplateData): CreateRuleData => {
  return createRuleDataSchema.parse(template.rule);
};
