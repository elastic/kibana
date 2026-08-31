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
  type RuleTemplateResponse,
} from '@kbn/alerting-v2-schemas';
import { RULE_TEMPLATE_SOURCE_TYPE } from '@kbn/alerting-v2-constants';

/**
 * Convert a v2 rule template into create-rule data, stamping provenance so the
 * rule can later be associated back to the template it was installed from.
 *
 * Re-parses `template.rule` even though {@link RuleTemplateData} already types it:
 * Fleet/SO storage only keeps an opaque bag, so runtime Zod validation here is the
 * safety boundary before rule creation.
 */
export const createRuleDataFromTemplate = (
  template: RuleTemplateData | RuleTemplateResponse
): CreateRuleData => {
  const rule = 'rule' in template && 'id' in template ? template.rule : (template as RuleTemplateData).rule;
  const templateId = 'id' in template ? (template as RuleTemplateResponse).id : undefined;

  const parsed = createRuleDataSchema.parse(rule);

  if (templateId) {
    parsed.metadata.source = {
      type: RULE_TEMPLATE_SOURCE_TYPE,
      data: { template_id: templateId },
    };
  }

  return parsed;
};
