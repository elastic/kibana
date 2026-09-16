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
 * - A state-transition phase that sets both `count` and `timeframe`. The visual
 *   form authors one dimension at a time (immediate, a count, or a timeframe)
 *   and has no control for the `operator` (`and` | `or`) that joins them.
 *   Combined phases stay in the YAML editor, which is where the operator is
 *   edited. Load, edit, and save keep an explicit operator and do not default
 *   a missing one. A recovering phase that still sets both thresholds stays
 *   YAML-only after recovery is set to `manual`. Save omits that phase, but
 *   switching to the form first would drop `operator` from the buffer.
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

interface PhaseThresholds {
  count?: number | null;
  timeframe?: string | null;
}

/** True when a phase sets both thresholds, the only shape that can carry `operator`. */
const phaseCombinesThresholds = (phase?: PhaseThresholds | null): boolean =>
  phase?.count != null && phase.timeframe != null;

const stateTransitionIsYamlOnly = (
  pending?: PhaseThresholds | null,
  recovering?: PhaseThresholds | null
): boolean => phaseCombinesThresholds(pending) || phaseCombinesThresholds(recovering);

/** True when the rule can only be edited through the YAML fallback. */
export const isNonRepresentableRule = (rule: RuleResponse): boolean => {
  if (rule.kind !== 'alert') return false;
  // A rule with no persisted query is builder-authored; it is represented by its
  // builder form, not by a query editor, so it is not non-representable.
  if (rule.query == null) return false;
  if (isNonRepresentable(rule.kind, rule)) return true;

  return stateTransitionIsYamlOnly(
    rule.state_transition?.pending,
    rule.state_transition?.recovering
  );
};

/** True when the in-progress form state can only be edited through the YAML fallback. */
export const isNonRepresentableFormState = (
  values: Pick<FormValues, 'kind' | 'recovery' | 'noData' | 'stateTransition'>
): boolean => {
  if (values.kind !== 'alert') return false;
  if (isNonRepresentable(values.kind, { recovery: values.recovery, no_data: values.noData })) {
    return true;
  }

  const { stateTransition } = values;
  return stateTransitionIsYamlOnly(
    { count: stateTransition?.pendingCount, timeframe: stateTransition?.pendingTimeframe },
    {
      count: stateTransition?.recoveringCount,
      timeframe: stateTransition?.recoveringTimeframe,
    }
  );
};
