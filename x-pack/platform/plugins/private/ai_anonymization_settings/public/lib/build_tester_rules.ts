/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegexAnonymizationRule } from '@kbn/ai-anonymization-common';

/**
 * Places the rule being edited among the enabled rules where the real pipeline would apply it, so
 * the preview resolves overlapping matches the same way (they are decided by rule order). An edited
 * rule keeps its saved position; a new rule is persisted after the existing ones, so it goes last.
 */
export const buildTesterRules = (
  draftRule: RegexAnonymizationRule,
  enabledRules: RegexAnonymizationRule[]
): RegexAnonymizationRule[] => {
  const isSavedRule = enabledRules.some((rule) => rule.id === draftRule.id);
  if (isSavedRule) {
    return enabledRules.map((rule) => (rule.id === draftRule.id ? draftRule : rule));
  }
  return [...enabledRules, draftRule];
};
