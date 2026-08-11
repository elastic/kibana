/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecoveryStrategy, RuleResponse } from '@kbn/alerting-v2-schemas';

const REPRESENTABLE_RECOVERY_STRATEGIES: readonly RecoveryStrategy[] = [
  'no_breach',
  'query',
  'none',
];

/**
 * Determines whether a rule (from the API response) contains features that
 * the GUI form cannot represent. Such rules must be edited in YAML mode only.
 *
 * Non-representable cases (alert kind only):
 * - `standalone` format with a `recovery` or `no_data` block present — the form
 *   has no editor for multi-query standalone; these blocks would be silently hidden.
 *   A standalone rule with only `breach.query` is representable: the unified editor
 *   produces exactly this shape for a conditionless query.
 * - `recovery_strategy` outside the form's supported set (`no_breach` | `query` | `none`; null/unset is fine)
 * - `no_data_strategy: 'emit'` (temporarily rejected by the write API; dropdown has no option)
 *
 * Note: `query.no_data` must be checked explicitly; it can appear on standalone queries
 * that are NOT representable. The old shortcut of treating all standalone as non-representable
 * no longer holds now that breach-only standalone is representable.
 */
export const isNonRepresentableRule = (rule: RuleResponse): boolean => {
  if (rule.kind !== 'alert') return false;

  if (rule.query.format === 'standalone') {
    if (rule.query.recovery || rule.query.no_data) return true;
  }

  if (
    rule.recovery_strategy != null &&
    !REPRESENTABLE_RECOVERY_STRATEGIES.includes(rule.recovery_strategy)
  ) {
    return true;
  }

  if (rule.no_data_strategy === 'emit') return true;

  return false;
};
