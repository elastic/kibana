/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse, CreateRuleData, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import {
  mapArtifacts,
  mergeArtifactsByType,
  splitArtifactsByType,
} from '../../form/utils/artifact_mappers';
import { ruleQueryToApiQuery, apiQueryToFormQuery } from '../../form/utils/query_mappers';
import {
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
} from '../../form/utils/state_transition_helpers';
import { resolveRecoveryStrategy } from '../../form/utils/rule_request_mappers';
import type { FormValues } from '../../form/types';
import type { BuilderSubmission } from './rule_builder/types';

const DELAY_IMMEDIATE = 'immediate';
const DELAY_BREACHES = 'breaches';
const DELAY_DURATION = 'duration';

const mapStateTransition = (formValues: FormValues) => {
  const { kind, stateTransition } = formValues;
  if (kind !== 'alert') return undefined;

  const alertMode = formValues.stateTransitionAlertDelayMode;
  const recoveryMode = formValues.stateTransitionRecoveryDelayMode;

  const out: Record<string, number | string> = {};

  if (alertMode === DELAY_IMMEDIATE) {
    out.pending_count = 0;
  } else if (alertMode === DELAY_BREACHES && stateTransition?.pendingCount != null) {
    out.pending_count = stateTransition.pendingCount;
  } else if (alertMode === DELAY_DURATION) {
    if (stateTransition?.pendingTimeframe != null)
      out.pending_timeframe = stateTransition.pendingTimeframe;
    if (stateTransition?.pendingCount != null) out.pending_count = stateTransition.pendingCount;
  }

  if (recoveryMode === DELAY_IMMEDIATE) {
    out.recovering_count = 0;
  } else if (recoveryMode !== DELAY_DURATION && stateTransition?.recoveringCount != null) {
    out.recovering_count = stateTransition.recoveringCount;
  } else if (recoveryMode === DELAY_DURATION) {
    if (stateTransition?.recoveringTimeframe != null)
      out.recovering_timeframe = stateTransition.recoveringTimeframe;
    if (stateTransition?.recoveringCount != null)
      out.recovering_count = stateTransition.recoveringCount;
  }

  return Object.keys(out).length ? out : undefined;
};

export const composeFormToCreateRequest = (
  formValues: FormValues,
  builder?: BuilderSubmission
): CreateRuleData => {
  const artifacts = mapArtifacts(mergeArtifactsByType(formValues));
  const recoveryStrategy = resolveRecoveryStrategy(formValues);

  const noDataStrategy = formValues.noDataStrategy;

  return {
    kind: formValues.kind,
    metadata: {
      name: formValues.metadata.name,
      description: formValues.metadata.description,
      owner: formValues.metadata.owner,
      ...(formValues.metadata.tags?.length ? { tags: formValues.metadata.tags } : {}),
      ...(builder ? { builder_type: builder.type, builder_fields: builder.fields } : {}),
    },
    time_field: formValues.timeField,
    schedule: { every: formValues.schedule.every, lookback: formValues.schedule.lookback },
    // The query in the form is a local preview when a builder is active; the
    // stored one is generated server-side so it can never disagree with the
    // parameters that produced it.
    ...(builder ? {} : { query: ruleQueryToApiQuery(formValues.query) }),
    ...(recoveryStrategy ? { recovery_strategy: recoveryStrategy } : {}),
    ...(noDataStrategy ? { no_data_strategy: noDataStrategy } : {}),
    grouping: formValues.grouping?.fields?.length
      ? { fields: formValues.grouping.fields }
      : undefined,
    state_transition: mapStateTransition(formValues),
    ...(artifacts ? { artifacts } : {}),
  };
};

export const composeFormToUpdateRequest = (
  formValues: FormValues,
  builder?: BuilderSubmission
): UpdateRuleData => {
  const { kind, ...request } = composeFormToCreateRequest(formValues, builder);
  const {
    grouping,
    state_transition,
    artifacts,
    metadata,
    recovery_strategy,
    no_data_strategy,
    query,
    ...rest
  } = request;
  return {
    ...rest,
    metadata: {
      ...metadata,
      // Saving without a builder means the user is authoring ES|QL directly, so
      // opt the rule out of builder mode explicitly. The server refuses a bare
      // query write on a builder rule rather than guessing intent.
      builder_type: builder ? builder.type : null,
      builder_fields: builder ? builder.fields : null,
      // Empty tags must be sent as an explicit `null` to clear them; omitting
      // the key would preserve the existing tags on a partial update.
      tags: formValues.metadata.tags?.length ? formValues.metadata.tags : null,
    },
    ...(query === undefined ? {} : { query }),
    recovery_strategy: resolveRecoveryStrategy(formValues) ?? null,
    no_data_strategy: no_data_strategy ?? null,
    grouping: grouping ?? null,
    state_transition: state_transition ?? null,
    artifacts: artifacts ?? null,
  };
};

// ---------------------------------------------------------------------------
// API response → FormValues
// ---------------------------------------------------------------------------

/** Bridge YAML parse output into compose form values for the Discover flyout. */
export const mapYamlFormValuesToComposeFormValues = (parsed: FormValues): FormValues => ({
  ...parsed,
  ...splitArtifactsByType(parsed.artifacts),
});

export const mapRuleToComposeFormValues = (rule: RuleResponse): FormValues => {
  const stateTransition: FormValues['stateTransition'] = rule.state_transition
    ? {
        pendingCount: rule.state_transition.pending_count ?? null,
        pendingTimeframe: rule.state_transition.pending_timeframe ?? null,
        recoveringCount: rule.state_transition.recovering_count ?? null,
        recoveringTimeframe: rule.state_transition.recovering_timeframe ?? null,
      }
    : undefined;

  return {
    kind: rule.kind,
    metadata: {
      name: rule.metadata.name,
      description: rule.metadata.description,
      enabled: rule.enabled,
      owner: rule.metadata.owner,
      tags: rule.metadata.tags,
    },
    timeField: rule.time_field,
    schedule: {
      every: rule.schedule.every,
      lookback: rule.schedule.lookback ?? '1m',
    },
    query: apiQueryToFormQuery(rule.query, rule.recovery_strategy),
    recoveryStrategy: rule.recovery_strategy ?? undefined,
    noDataStrategy: rule.no_data_strategy ?? (rule.kind === 'alert' ? 'none' : undefined),
    ...(rule.grouping ? { grouping: { fields: rule.grouping.fields } } : {}),
    stateTransition,
    stateTransitionAlertDelayMode: deriveAlertDelayModeFromStateTransition(stateTransition),
    stateTransitionRecoveryDelayMode: deriveRecoveryDelayModeFromStateTransition(stateTransition),
    ...splitArtifactsByType(rule.artifacts),
  };
};
