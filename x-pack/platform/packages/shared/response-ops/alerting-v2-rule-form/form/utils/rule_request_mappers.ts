/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse, CreateRuleData, Query, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import { getBreachEsqlQuery } from '@kbn/alerting-v2-schemas';
import { DELAY_MODE } from '../types';
import type { FormValues, StateTransition } from '../types';
import {
  mapArtifacts,
  mergeArtifactsByType,
  splitArtifactsByType,
  type RuleArtifactPayload,
} from './artifact_mappers';

// ---------------------------------------------------------------------------
// FormValues → API request
// ---------------------------------------------------------------------------

const mapMetadata = (metadata: FormValues['metadata']) => ({
  name: metadata.name,
  description: metadata.description,
  owner: metadata.owner,
  ...(metadata.tags?.length ? { tags: metadata.tags } : {}),
});

const mapSchedule = (schedule: FormValues['schedule']) => ({
  every: schedule.every,
  lookback: schedule.lookback,
});

/**
 * Builds the API `query` field from the form's query values. Emits
 * `standalone` format with an optional `recovery` block when the compose
 * discover flow has configured a custom recovery condition. The corresponding
 * `recovery_strategy: 'query'` is emitted as a top-level field in
 * `mapFormValuesToRuleRequest`.
 */
const mapQuery = (query: FormValues['query']): Query => ({
  format: 'standalone',
  breach: { query: query.breach },
  ...(query.recover ? { recovery: { query: query.recover } } : {}),
});

const mapGrouping = (grouping: FormValues['grouping']) =>
  grouping?.fields?.length ? { fields: grouping.fields } : undefined;

/** Derives alert-delay mode from persisted `state_transition` (same rules as `AlertDelayField`). */
export const deriveAlertDelayModeFromStateTransition = (
  stateTransition?: StateTransition | null
): FormValues['stateTransitionAlertDelayMode'] => {
  if (stateTransition?.pendingTimeframe != null) return DELAY_MODE.duration;
  if (stateTransition?.pendingCount != null && stateTransition.pendingCount > 0)
    return DELAY_MODE.breaches;
  return DELAY_MODE.immediate;
};

/** Derives recovery-delay mode from persisted `state_transition` (same rules as `RecoveryDelayField`). */
export const deriveRecoveryDelayModeFromStateTransition = (
  stateTransition?: StateTransition | null
): FormValues['stateTransitionRecoveryDelayMode'] => {
  if (stateTransition?.recoveringTimeframe != null) return DELAY_MODE.duration;
  if (stateTransition?.recoveringCount != null && stateTransition.recoveringCount > 0)
    return DELAY_MODE.recoveries;
  return DELAY_MODE.immediate;
};

const mapStateTransition = (formValues: FormValues) => {
  const { kind, stateTransition } = formValues;
  if (kind !== 'alert') return undefined;

  const alertMode =
    formValues.stateTransitionAlertDelayMode ??
    deriveAlertDelayModeFromStateTransition(stateTransition);
  const recoveryMode =
    formValues.stateTransitionRecoveryDelayMode ??
    deriveRecoveryDelayModeFromStateTransition(stateTransition);

  const out: NonNullable<RuleRequestCommon['state_transition']> = {};

  if (alertMode === DELAY_MODE.immediate) {
    out.pending_count = 0;
  } else if (alertMode === DELAY_MODE.breaches && stateTransition?.pendingCount != null) {
    out.pending_count = stateTransition.pendingCount;
  } else if (alertMode === DELAY_MODE.duration) {
    if (stateTransition?.pendingTimeframe != null) {
      out.pending_timeframe = stateTransition.pendingTimeframe;
    }
    if (stateTransition?.pendingCount != null) {
      out.pending_count = stateTransition.pendingCount;
    }
  }

  if (recoveryMode === DELAY_MODE.immediate) {
    out.recovering_count = 0;
  } else if (recoveryMode !== DELAY_MODE.duration && stateTransition?.recoveringCount != null) {
    out.recovering_count = stateTransition.recoveringCount;
  } else if (recoveryMode === DELAY_MODE.duration) {
    if (stateTransition?.recoveringTimeframe != null) {
      out.recovering_timeframe = stateTransition.recoveringTimeframe;
    }
    if (stateTransition?.recoveringCount != null) {
      out.recovering_count = stateTransition.recoveringCount;
    }
  }

  if (Object.keys(out).length === 0) return undefined;
  return out;
};

/**
 * Common rule request shape shared between create and update payloads.
 * Contains all fields except `kind` (only required for create).
 */
export interface RuleRequestCommon {
  metadata: { name: string; description?: string; owner?: string; tags?: string[] };
  time_field: string;
  schedule: { every: string; lookback?: string };
  query: Query;
  recovery_strategy?: 'query';
  grouping?: { fields: string[] };
  state_transition?: {
    pending_count?: number;
    pending_timeframe?: string;
    recovering_count?: number;
    recovering_timeframe?: string;
  };
  artifacts?: RuleArtifactPayload;
}

/**
 * Maps `FormValues` to the common API request shape (snake_case) shared by
 * both create and update endpoints. Does not include `kind`.
 */
export const mapFormValuesToRuleRequest = (formValues: FormValues): RuleRequestCommon => {
  const { metadata, timeField, schedule, query, grouping } = formValues;
  const mappedArtifacts = mapArtifacts(mergeArtifactsByType(formValues));

  return {
    metadata: mapMetadata(metadata),
    time_field: timeField,
    schedule: mapSchedule(schedule),
    query: mapQuery(query),
    ...(query.recover ? { recovery_strategy: 'query' as const } : {}),
    grouping: mapGrouping(grouping),
    state_transition: mapStateTransition(formValues),
    ...(mappedArtifacts ? { artifacts: mappedArtifacts } : {}),
  };
};

/**
 * Maps `FormValues` to the create API request payload.
 * Adds `kind` on top of the common request shape since it is required for creation.
 */
export const mapFormValuesToCreateRequest = (formValues: FormValues): CreateRuleData => ({
  kind: formValues.kind,
  ...mapFormValuesToRuleRequest(formValues),
});

/**
 * Maps `FormValues` to the update API request payload.
 * Coerces absent optional fields to `null` so the API interprets them as
 * explicit removals (as opposed to `undefined` which omits the key entirely).
 */
export const mapFormValuesToUpdateRequest = (formValues: FormValues): UpdateRuleData => {
  const { grouping, state_transition, artifacts, ...rest } = mapFormValuesToRuleRequest(formValues);

  return {
    ...rest,
    grouping: grouping ?? null,
    state_transition: state_transition ?? null,
    artifacts: artifacts ?? null,
  };
};

// ---------------------------------------------------------------------------
// API response → FormValues
// ---------------------------------------------------------------------------

/**
 * Maps a `RuleResponse` (API shape, snake_case) to `Partial<FormValues>` (form shape, camelCase).
 *
 * Only fields present in the response are included so the form defaults fill in the rest.
 * Use this when populating the edit form with an existing rule's data.
 *
 * The form has a single breach-query field, so composed-format rules are
 * flattened to their effective breach query. Recover and no-data queries on
 * the existing rule are dropped: the form does not yet surface them and
 * saving will overwrite the rule with a `standalone` query containing only
 * the (possibly edited) breach.
 */
export const mapRuleResponseToFormValues = (rule: RuleResponse): Partial<FormValues> => {
  const stateTransition: StateTransition = {
    pendingCount: rule.state_transition?.pending_count ?? null,
    pendingTimeframe: rule.state_transition?.pending_timeframe ?? null,
    recoveringCount: rule.state_transition?.recovering_count ?? null,
    recoveringTimeframe: rule.state_transition?.recovering_timeframe ?? null,
  };

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
    query: {
      breach: getBreachEsqlQuery(rule.query),
    },
    ...(rule.grouping ? { grouping: { fields: rule.grouping.fields } } : {}),
    stateTransition,
    stateTransitionAlertDelayMode: deriveAlertDelayModeFromStateTransition(stateTransition),
    stateTransitionRecoveryDelayMode: deriveRecoveryDelayModeFromStateTransition(stateTransition),
    ...splitArtifactsByType(rule.artifacts),
  };
};
