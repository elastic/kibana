/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind, RuleResponse } from '@kbn/alerting-v2-schemas';
import { recoveryStrategy } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';

/**
 * Non-representable rules fall back to the YAML editor. The only such shape is
 * `recovery.strategy: 'query'` on an alert rule: the form authors recovery as a
 * condition appended to `query.base`, so it has no editor for a full
 * independent recovery query.
 */
const isNonRepresentable = (kind: RuleKind, strategy: string | null | undefined): boolean =>
  kind === 'alert' && strategy === recoveryStrategy.query;

/** True when the rule can only be edited through the YAML fallback. */
export const isNonRepresentableRule = (rule: RuleResponse): boolean =>
  isNonRepresentable(rule.kind, rule.recovery?.strategy);

/** True when the in-progress form state can only be edited through the YAML fallback. */
export const isNonRepresentableFormState = (
  values: Pick<FormValues, 'kind' | 'recovery'>
): boolean => isNonRepresentable(values.kind, values.recovery?.strategy);
