/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse, CreateRuleData, UpdateRuleData, Query } from '@kbn/alerting-v2-schemas';
import {
  mapArtifacts,
  mergeArtifactsByType,
  splitArtifactsByType,
} from '../../form/utils/artifact_mappers';
import type { ComposeFormValues } from './compose_form_types';

const DELAY_IMMEDIATE = 'immediate';
const DELAY_BREACHES = 'breaches';
const DELAY_DURATION = 'duration';

const mapStateTransition = (formValues: ComposeFormValues) => {
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

/**
 * The compose form stores recovery as an optional leaf (no strategy field) —
 * presence means "custom recovery query". Translate to the canonical API
 * `recovery` discriminated union here.
 */
const composeQueryToApiQuery = (q: ComposeFormValues['query']): Query => {
  if (q.format === 'composed') {
    return {
      format: 'composed',
      base: q.base,
      breach: { segment: q.breach.segment },
      ...(q.recovery
        ? { recovery: { strategy: 'query' as const, segment: q.recovery.segment } }
        : {}),
    };
  }
  return {
    format: 'standalone',
    breach: { query: q.breach.query },
    ...(q.recovery ? { recovery: { strategy: 'query' as const, query: q.recovery.query } } : {}),
  };
};

export const composeFormToCreateRequest = (
  formValues: ComposeFormValues,
  builderType?: string
): CreateRuleData => {
  const artifacts = mapArtifacts(mergeArtifactsByType(formValues));

  return {
    kind: formValues.kind,
    metadata: {
      name: formValues.metadata.name,
      description: formValues.metadata.description,
      owner: formValues.metadata.owner,
      ...(formValues.metadata.tags?.length ? { tags: formValues.metadata.tags } : {}),
      ...(builderType ? { builder_type: builderType } : {}),
    },
    time_field: formValues.timeField,
    schedule: { every: formValues.schedule.every, lookback: formValues.schedule.lookback },
    query: composeQueryToApiQuery(formValues.query),
    grouping: formValues.grouping?.fields?.length
      ? { fields: formValues.grouping.fields }
      : undefined,
    state_transition: mapStateTransition(formValues),
    ...(artifacts ? { artifacts } : {}),
  };
};

export const composeFormToUpdateRequest = (
  formValues: ComposeFormValues,
  builderType?: string
): UpdateRuleData => {
  const { kind, ...request } = composeFormToCreateRequest(formValues, builderType);
  const { grouping, state_transition, artifacts, metadata, ...rest } = request;
  return {
    ...rest,
    metadata: {
      ...metadata,
      builder_type: metadata.builder_type ?? null,
    },
    grouping: grouping ?? null,
    state_transition: state_transition ?? null,
    artifacts: artifacts ?? null,
  };
};

// ---------------------------------------------------------------------------
// API response → ComposeFormValues
// ---------------------------------------------------------------------------

/**
 * Maps the API query shape to the compose form's narrower shape. The compose
 * form does not surface `no_data` or `recovery.strategy === 'no_breach'` —
 * `no_data` is dropped here, and a `no_breach` recovery becomes "no recovery
 * configured" on the form (it will revert to disabled on save if the user
 * doesn't change anything).
 */
const apiQueryToRuleQuery = (q: RuleResponse['query']): ComposeFormValues['query'] => {
  if (q.format === 'composed') {
    return {
      format: 'composed',
      base: q.base,
      breach: { segment: q.breach.segment },
      ...(q.recovery?.strategy === 'query' ? { recovery: { segment: q.recovery.segment } } : {}),
    };
  }
  return {
    format: 'standalone',
    breach: { query: q.breach.query },
    ...(q.recovery?.strategy === 'query' ? { recovery: { query: q.recovery.query } } : {}),
  };
};

const deriveAlertDelayMode = (
  st?: ComposeFormValues['stateTransition']
): ComposeFormValues['stateTransitionAlertDelayMode'] => {
  if (st?.pendingTimeframe != null) return DELAY_DURATION;
  if (st?.pendingCount != null && st.pendingCount > 0) return DELAY_BREACHES;
  return DELAY_IMMEDIATE;
};

const deriveRecoveryDelayMode = (
  st?: ComposeFormValues['stateTransition']
): ComposeFormValues['stateTransitionRecoveryDelayMode'] => {
  if (st?.recoveringTimeframe != null) return DELAY_DURATION;
  if (st?.recoveringCount != null && st.recoveringCount > 0) return 'recoveries';
  return DELAY_IMMEDIATE;
};

export const mapRuleToComposeFormValues = (rule: RuleResponse): ComposeFormValues => {
  const stateTransition: ComposeFormValues['stateTransition'] = rule.state_transition
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
    query: apiQueryToRuleQuery(rule.query),
    ...(rule.grouping ? { grouping: { fields: rule.grouping.fields } } : {}),
    stateTransition,
    stateTransitionAlertDelayMode: deriveAlertDelayMode(stateTransition),
    stateTransitionRecoveryDelayMode: deriveRecoveryDelayMode(stateTransition),
    ...splitArtifactsByType(rule.artifacts),
  };
};
