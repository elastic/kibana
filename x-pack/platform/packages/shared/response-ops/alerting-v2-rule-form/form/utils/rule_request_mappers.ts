/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse, CreateRuleData, Query, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import type { FormValues, StateTransition, RuleQuery } from '../types';
import {
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
} from '../types';
import {
  mapArtifacts,
  mergeArtifactsByType,
  splitArtifactsByType,
  type RuleArtifactPayload,
} from './artifact_mappers';

// ---------------------------------------------------------------------------
// FormValues → API request
// ---------------------------------------------------------------------------

const mapMetadata = (metadata: FormValues['metadata'], builderType?: string) => ({
  name: metadata.name,
  description: metadata.description,
  owner: metadata.owner,
  ...(metadata.tags?.length ? { tags: metadata.tags } : {}),
  ...(builderType ? { builder_type: builderType } : {}),
});

const mapSchedule = (schedule: FormValues['schedule']) => ({
  every: schedule.every,
  lookback: schedule.lookback,
});

const mapQuery = (query: RuleQuery): Query => {
  if (query.format === 'composed') {
    return {
      format: 'composed',
      base: query.base,
      breach: { segment: query.breach.segment },
      ...(query.recovery ? { recovery: { segment: query.recovery.segment } } : {}),
    };
  }
  return {
    format: 'standalone',
    breach: { query: query.breach.query },
    ...(query.recovery ? { recovery: { query: query.recovery.query } } : {}),
    ...(query.no_data ? { no_data: { query: query.no_data.query } } : {}),
  };
};

const mapGrouping = (grouping: FormValues['grouping']) =>
  grouping?.fields?.length ? { fields: grouping.fields } : undefined;

/**
 * Passthrough serialization of state transition (camelCase → snake_case).
 * Field-level filtering by delay mode is intentionally not done here —
 * the API's Zod schema handles validation, and the server's director
 * strategies only read the fields relevant to the configured strategy.
 */
const mapStateTransition = (
  st?: StateTransition
): RuleRequestCommon['state_transition'] | undefined => {
  if (!st) return undefined;
  const out: NonNullable<RuleRequestCommon['state_transition']> = {};
  if (st.pendingCount != null) out.pending_count = st.pendingCount;
  if (st.pendingTimeframe != null) out.pending_timeframe = st.pendingTimeframe;
  if (st.recoveringCount != null) out.recovering_count = st.recoveringCount;
  if (st.recoveringTimeframe != null) out.recovering_timeframe = st.recoveringTimeframe;
  return Object.keys(out).length ? out : undefined;
};

/**
 * Common rule request shape shared between create and update payloads.
 * Contains all fields except `kind` (only required for create).
 */
export interface RuleRequestCommon {
  metadata: {
    name: string;
    description?: string;
    owner?: string;
    tags?: string[];
    builder_type?: string;
  };
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

export const mapFormValuesToRuleRequest = (
  formValues: FormValues,
  builderType?: string
): RuleRequestCommon => {
  const { metadata, timeField, schedule, query, grouping, stateTransition } = formValues;
  const mappedArtifacts = mapArtifacts(mergeArtifactsByType(formValues));
  const hasRecovery = query.recovery != null;

  return {
    metadata: mapMetadata(metadata, builderType),
    time_field: timeField,
    schedule: mapSchedule(schedule),
    query: mapQuery(query),
    ...(hasRecovery ? { recovery_strategy: 'query' as const } : {}),
    grouping: mapGrouping(grouping),
    state_transition: mapStateTransition(stateTransition),
    ...(mappedArtifacts ? { artifacts: mappedArtifacts } : {}),
  };
};

export const mapFormValuesToCreateRequest = (
  formValues: FormValues,
  builderType?: string
): CreateRuleData => ({
  kind: formValues.kind,
  ...mapFormValuesToRuleRequest(formValues, builderType),
});

export const mapFormValuesToUpdateRequest = (
  formValues: FormValues,
  builderType?: string
): UpdateRuleData => {
  const { grouping, state_transition, artifacts, metadata, ...rest } =
    mapFormValuesToRuleRequest(formValues, builderType);

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
// API response → FormValues
// ---------------------------------------------------------------------------

const apiQueryToRuleQuery = (
  q: RuleResponse['query'],
  recoveryStrategy?: RuleResponse['recovery_strategy']
): RuleQuery => {
  if (q.format === 'composed') {
    return {
      format: 'composed',
      base: q.base,
      breach: { segment: q.breach.segment },
      ...(recoveryStrategy === 'query' && q.recovery
        ? { recovery: { segment: q.recovery.segment } }
        : {}),
    };
  }
  return {
    format: 'standalone',
    breach: { query: q.breach.query },
    ...(recoveryStrategy === 'query' && q.recovery
      ? { recovery: { query: q.recovery.query } }
      : {}),
  };
};

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
    query: apiQueryToRuleQuery(rule.query, rule.recovery_strategy),
    ...(rule.grouping ? { grouping: { fields: rule.grouping.fields } } : {}),
    stateTransition,
    stateTransitionAlertDelayMode: deriveAlertDelayModeFromStateTransition(stateTransition),
    stateTransitionRecoveryDelayMode: deriveRecoveryDelayModeFromStateTransition(stateTransition),
    ...splitArtifactsByType(rule.artifacts),
  };
};
