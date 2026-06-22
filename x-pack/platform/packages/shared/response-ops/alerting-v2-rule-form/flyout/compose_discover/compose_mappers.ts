/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse, CreateRuleData, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import { splitArtifactsByType } from '../../form/utils/artifact_mappers';
import { DELAY_MODE } from '../../form/types';
import type { FormValues } from '../../form/types';
import {
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
} from '../../form/types';
import {
  mapFormValuesToCreateRequest as baseCreateRequest,
  mapFormValuesToUpdateRequest as baseUpdateRequest,
  mapRuleResponseToFormValues,
  type RuleRequestCommon,
} from '../../form/utils/rule_request_mappers';
import type { ComposeFormValues } from './compose_form_types';

/**
 * Applies GUI delay-mode logic to the state_transition block.
 *
 * The base `rule_request_mappers` do a naive camelCase→snake_case passthrough
 * (sufficient for the API, which validates via Zod). This function filters
 * the transition fields based on the delay-mode enum the user selected in the
 * form UI, ensuring the submitted payload only contains the fields that match
 * the active mode (immediate / breaches / duration).
 */
const applyDelayModeFilter = (
  formValues: ComposeFormValues
): RuleRequestCommon['state_transition'] | undefined => {
  if (formValues.kind !== 'alert') return undefined;

  const alertMode =
    formValues.stateTransitionAlertDelayMode ??
    deriveAlertDelayModeFromStateTransition(formValues.stateTransition);
  const recoveryMode =
    formValues.stateTransitionRecoveryDelayMode ??
    deriveRecoveryDelayModeFromStateTransition(formValues.stateTransition);

  const st = formValues.stateTransition;
  const out: NonNullable<RuleRequestCommon['state_transition']> = {};

  if (alertMode === DELAY_MODE.immediate) {
    out.pending_count = 0;
  } else if (alertMode === DELAY_MODE.breaches && st?.pendingCount != null) {
    out.pending_count = st.pendingCount;
  } else if (alertMode === DELAY_MODE.duration) {
    if (st?.pendingTimeframe != null) out.pending_timeframe = st.pendingTimeframe;
    if (st?.pendingCount != null) out.pending_count = st.pendingCount;
  }

  if (recoveryMode === DELAY_MODE.immediate) {
    out.recovering_count = 0;
  } else if (recoveryMode !== DELAY_MODE.duration && st?.recoveringCount != null) {
    out.recovering_count = st.recoveringCount;
  } else if (recoveryMode === DELAY_MODE.duration) {
    if (st?.recoveringTimeframe != null) out.recovering_timeframe = st.recoveringTimeframe;
    if (st?.recoveringCount != null) out.recovering_count = st.recoveringCount;
  }

  return Object.keys(out).length ? out : undefined;
};

export const composeFormToCreateRequest = (
  formValues: ComposeFormValues,
  builderType?: string
): CreateRuleData => {
  const request = baseCreateRequest(formValues, builderType);
  return {
    ...request,
    state_transition: applyDelayModeFilter(formValues),
  };
};

export const composeFormToUpdateRequest = (
  formValues: ComposeFormValues,
  builderType?: string
): UpdateRuleData => {
  const request = baseUpdateRequest(formValues, builderType);
  return {
    ...request,
    state_transition: applyDelayModeFilter(formValues) ?? null,
  };
};

export const mapRuleToComposeFormValues = (rule: RuleResponse): ComposeFormValues =>
  mapRuleResponseToFormValues(rule) as ComposeFormValues;

/** Bridge YAML parse output into compose form values for the Discover flyout. */
export const mapYamlFormValuesToComposeFormValues = (parsed: FormValues): ComposeFormValues => ({
  ...parsed,
  ...splitArtifactsByType(parsed.artifacts),
});
