/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateTransition as ApiStateTransition } from '@kbn/alerting-v2-schemas';
import { DELAY_MODE } from '../types';
import type { FormValues, StateTransition } from '../types';
import { isRecoveryEnabled } from './lifecycle_mappers';

/** Derives alert-delay mode from persisted `state_transition`. */
export const deriveAlertDelayModeFromStateTransition = (
  stateTransition?: StateTransition | null
): FormValues['stateTransitionAlertDelayMode'] => {
  if (stateTransition?.pendingTimeframe != null) return DELAY_MODE.duration;
  if (stateTransition?.pendingCount != null && stateTransition.pendingCount > 0)
    return DELAY_MODE.breaches;
  return DELAY_MODE.immediate;
};

/** Derives recovery-delay mode from persisted `state_transition`. */
export const deriveRecoveryDelayModeFromStateTransition = (
  stateTransition?: StateTransition | null
): FormValues['stateTransitionRecoveryDelayMode'] => {
  if (stateTransition?.recoveringTimeframe != null) return DELAY_MODE.duration;
  if (stateTransition?.recoveringCount != null && stateTransition.recoveringCount > 0)
    return DELAY_MODE.recoveries;
  return DELAY_MODE.immediate;
};

type StateTransitionPhase = NonNullable<ApiStateTransition['pending']>;

const buildPendingPhase = (
  mode: FormValues['stateTransitionAlertDelayMode'],
  stateTransition: StateTransition | null | undefined
): StateTransitionPhase | undefined => {
  if (mode === DELAY_MODE.immediate) return { count: 0 };
  if (mode === DELAY_MODE.duration) {
    return {
      ...(stateTransition?.pendingCount != null ? { count: stateTransition.pendingCount } : {}),
      ...(stateTransition?.pendingTimeframe != null
        ? { timeframe: stateTransition.pendingTimeframe }
        : {}),
    };
  }
  if (mode === DELAY_MODE.breaches && stateTransition?.pendingCount != null) {
    return { count: stateTransition.pendingCount };
  }
  return undefined;
};

const buildRecoveringPhase = (
  mode: FormValues['stateTransitionRecoveryDelayMode'],
  stateTransition: StateTransition | null | undefined
): StateTransitionPhase | undefined => {
  if (mode === DELAY_MODE.immediate) return { count: 0 };
  if (mode === DELAY_MODE.duration) {
    return {
      ...(stateTransition?.recoveringCount != null
        ? { count: stateTransition.recoveringCount }
        : {}),
      ...(stateTransition?.recoveringTimeframe != null
        ? { timeframe: stateTransition.recoveringTimeframe }
        : {}),
    };
  }
  if (stateTransition?.recoveringCount != null) {
    return { count: stateTransition.recoveringCount };
  }
  return undefined;
};

/**
 * Builds the API `state_transition` block from the form's delay modes. Returns
 * `undefined` for signal rules and whenever no phase carries a threshold.
 */
export const buildStateTransitionRequest = (
  formValues: FormValues
): ApiStateTransition | undefined => {
  const { kind, stateTransition } = formValues;
  if (kind !== 'alert') return undefined;

  const alertMode =
    formValues.stateTransitionAlertDelayMode ??
    deriveAlertDelayModeFromStateTransition(stateTransition);
  const recoveryMode =
    formValues.stateTransitionRecoveryDelayMode ??
    deriveRecoveryDelayModeFromStateTransition(stateTransition);

  const pending = buildPendingPhase(alertMode, stateTransition);
  // Recovering thresholds are inert — and rejected by the write API — when the
  // rule never recovers on its own.
  const recovering = isRecoveryEnabled(formValues)
    ? buildRecoveringPhase(recoveryMode, stateTransition)
    : undefined;

  const out: ApiStateTransition = {
    ...(pending && Object.keys(pending).length ? { pending } : {}),
    ...(recovering && Object.keys(recovering).length ? { recovering } : {}),
  };

  return Object.keys(out).length ? out : undefined;
};

/** Maps the API `state_transition` block onto the form's flat camelCase shape. */
export const apiStateTransitionToFormStateTransition = (
  stateTransition: ApiStateTransition | null | undefined
): StateTransition => ({
  pendingCount: stateTransition?.pending?.count ?? null,
  pendingTimeframe: stateTransition?.pending?.timeframe ?? null,
  recoveringCount: stateTransition?.recovering?.count ?? null,
  recoveringTimeframe: stateTransition?.recovering?.timeframe ?? null,
});
