/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind, RuleResponse } from '@kbn/alerting-v2-schemas';
import { noDataStrategy, recoveryStrategy } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';

/** The lifecycle blocks read structurally, so a form value and a response both fit. */
interface LifecycleShape {
  recovery?: { strategy?: string } | null;
  no_data?: { strategy?: string; query?: string } | null;
}

/**
 * Non-representable rules fall back to the YAML editor, which is the only place
 * their configuration is visible:
 *
 * - `recovery.strategy: 'query'` — the form authors recovery as a condition
 *   appended to `query.base`, so it has no editor for an independent query.
 * - `no_data.strategy: 'alert'` — the strategy select omits it because the write
 *   API rejects it, so the form would show no selection and resubmit a value
 *   that cannot be saved.
 * - `no_data.query` — the form has no editor for a presence query, and changing
 *   the strategy would drop it without the user ever seeing it.
 */
const isNonRepresentable = (
  kind: RuleKind,
  { recovery, no_data: noData }: LifecycleShape
): boolean => {
  if (kind !== 'alert') return false;

  return (
    recovery?.strategy === recoveryStrategy.query ||
    noData?.strategy === noDataStrategy.alert ||
    Boolean(noData?.query)
  );
};

/** True when the rule can only be edited through the YAML fallback. */
export const isNonRepresentableRule = (rule: RuleResponse): boolean =>
  isNonRepresentable(rule.kind, rule);

/** True when the in-progress form state can only be edited through the YAML fallback. */
export const isNonRepresentableFormState = (
  values: Pick<FormValues, 'kind' | 'recovery' | 'noData'>
): boolean =>
  isNonRepresentable(values.kind, { recovery: values.recovery, no_data: values.noData });
