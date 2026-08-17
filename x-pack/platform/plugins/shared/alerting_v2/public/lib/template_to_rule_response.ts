/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import type { RuleApiResponse } from '../services/rules_api';

/**
 * Adapt a rule template into a {@link RuleApiResponse} so the create flyout
 * can seed every step from `template.rule`. Server-owned fields are placeholders
 * because the template is not a persisted rule.
 */
export const templateToRuleResponse = (
  template: RuleTemplateResponse,
  now = new Date().toISOString()
): RuleApiResponse => ({
  ...template.rule,
  id: template.id,
  metadata: {
    ...template.rule.metadata,
    version: 1,
  },
  enabled: true,
  created_by: null,
  created_at: now,
  updated_by: null,
  updated_at: now,
});
