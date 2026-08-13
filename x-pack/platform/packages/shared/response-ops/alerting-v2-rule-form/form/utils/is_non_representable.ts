/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NoDataStrategy,
  RecoveryStrategy,
  RuleKind,
  RuleResponse,
} from '@kbn/alerting-v2-schemas';
import type { RuleQuery } from '../types';

const REPRESENTABLE_RECOVERY_STRATEGIES: readonly RecoveryStrategy[] = [
  'no_breach',
  'query',
  'none',
];

/** The only query format each kind can be authored as. */
const REPRESENTABLE_QUERY_FORMAT: Record<RuleKind, RuleQuery['format']> = {
  alert: 'composed',
  signal: 'standalone',
};

interface RepresentabilityInput {
  kind: RuleKind;
  queryFormat: RuleQuery['format'];
  recoveryStrategy: RecoveryStrategy | null | undefined;
  noDataStrategy: NoDataStrategy | null | undefined;
}

/**
 * Non-representable cases:
 * - `query.format` other than the kind's required format — the form authors
 *   `alert` as `composed` (base + breach segment) and `signal` as
 *   `standalone`. Any other pairing has no editor for it.
 * - `recovery_strategy` outside the form's supported set (`no_breach` | `query` | `none`; null/unset is fine) — alert only
 * - `no_data_strategy: 'emit'` (temporarily rejected by the write API; dropdown has no option) — alert only
 */
const isNonRepresentable = ({
  kind,
  queryFormat,
  recoveryStrategy,
  noDataStrategy,
}: RepresentabilityInput): boolean => {
  if (queryFormat !== REPRESENTABLE_QUERY_FORMAT[kind]) return true;
  if (kind !== 'alert') return false;

  if (recoveryStrategy != null && !REPRESENTABLE_RECOVERY_STRATEGIES.includes(recoveryStrategy)) {
    return true;
  }

  if (noDataStrategy === 'emit') return true;

  return false;
};

export const isNonRepresentableRule = (rule: RuleResponse): boolean =>
  isNonRepresentable({
    kind: rule.kind,
    queryFormat: rule.query.format,
    recoveryStrategy: rule.recovery_strategy,
    noDataStrategy: rule.no_data_strategy,
  });

export const isNonRepresentableFormState = (values: {
  kind: RuleKind;
  query: RuleQuery;
  recoveryStrategy?: RecoveryStrategy;
  noDataStrategy?: NoDataStrategy;
}): boolean =>
  isNonRepresentable({
    kind: values.kind,
    queryFormat: values.query.format,
    recoveryStrategy: values.recoveryStrategy,
    noDataStrategy: values.noDataStrategy,
  });
