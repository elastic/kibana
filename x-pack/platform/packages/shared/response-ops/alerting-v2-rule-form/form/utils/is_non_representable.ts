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
 * Non-representable cases:
 * - `alert` kind with `standalone` query format (form requires composed base+segments)
 * - `recovery_strategy` outside the form's supported set (`no_breach` | `query` | `none`; null/unset is fine)
 * - `no_data_strategy: 'emit'` (temporarily rejected by the write API; dropdown has no option)
 *
 * Note: `query.no_data` is not checked separately because it can only appear on
 * standalone format queries, which the `format === 'standalone'` check already catches.
 */
export const isNonRepresentableRule = (rule: RuleResponse): boolean => {
  if (rule.kind !== 'alert') return false;

  if (rule.query.format === 'standalone') return true;

  if (
    rule.recovery_strategy != null &&
    !REPRESENTABLE_RECOVERY_STRATEGIES.includes(rule.recovery_strategy)
  ) {
    return true;
  }

  if (rule.no_data_strategy === 'emit') return true;

  return false;
};
