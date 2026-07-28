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
 * Maps a rule template to {@link CreateRuleData}.
 *
 * Strips template-only fields (`engine`) and applies create-rule validation
 * (including cross-field refinements).
 */
export const createRuleDataFromTemplate = (template: RuleTemplateData): CreateRuleData => {
  const { engine: _engine, ...ruleFields } = template;
  return createRuleDataSchema.parse(ruleFields);
};
