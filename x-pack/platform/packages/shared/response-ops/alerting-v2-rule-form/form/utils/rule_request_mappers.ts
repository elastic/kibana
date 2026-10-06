/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleResponse,
  CreateRuleData,
  NoData,
  Query,
  Recovery,
  StateTransition,
  UpdateRuleData,
} from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';
import {
  apiStateTransitionToFormStateTransition,
  buildStateTransitionRequest,
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
} from './state_transition_helpers';
import { ruleQueryToApiQuery, apiQueryToFormQuery } from './query_mappers';
import {
  apiNoDataToFormNoData,
  apiRecoveryToFormRecovery,
  formNoDataToApiNoData,
  formRecoveryToApiRecovery,
} from './lifecycle_mappers';
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
  ...(metadata.tags?.length ? { tags: metadata.tags } : {}),
});

const mapSchedule = (schedule: FormValues['schedule']) => ({
  every: schedule.every,
  lookback: schedule.lookback,
});

const mapGrouping = (grouping: FormValues['grouping']) =>
  grouping?.fields?.length ? { fields: grouping.fields } : undefined;

/**
 * Common rule request shape shared between create and update payloads.
 * Contains all fields except `kind` (only required for create).
 */
export interface RuleRequestCommon {
  metadata: { name: string; description?: string; tags?: string[] };
  time_field: string;
  schedule: { every: string; lookback?: string };
  query: Query;
  recovery?: Recovery;
  no_data?: NoData;
  grouping?: { fields: string[] };
  state_transition?: StateTransition;
  artifacts?: RuleArtifactPayload;
}

export const mapFormValuesToRuleRequest = (formValues: FormValues): RuleRequestCommon => {
  const { metadata, timeField, schedule, query, grouping } = formValues;
  const mappedArtifacts = mapArtifacts(mergeArtifactsByType(formValues));
  const recovery = formRecoveryToApiRecovery(formValues);
  const noData = formNoDataToApiNoData(formValues);

  return {
    metadata: mapMetadata(metadata),
    time_field: timeField,
    schedule: mapSchedule(schedule),
    query: ruleQueryToApiQuery(query),
    ...(recovery ? { recovery } : {}),
    ...(noData ? { no_data: noData } : {}),
    grouping: mapGrouping(grouping),
    state_transition: buildStateTransitionRequest(formValues),
    ...(mappedArtifacts ? { artifacts: mappedArtifacts } : {}),
  };
};

export const mapFormValuesToCreateRequest = (formValues: FormValues): CreateRuleData => ({
  kind: formValues.kind,
  ...mapFormValuesToRuleRequest(formValues),
});

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

export const mapRuleResponseToFormValues = (rule: RuleResponse): Partial<FormValues> => {
  const stateTransition = apiStateTransitionToFormStateTransition(rule.state_transition);

  return {
    kind: rule.kind,
    metadata: {
      name: rule.metadata.name,
      description: rule.metadata.description,
      enabled: rule.enabled,
      tags: rule.metadata.tags,
    },
    timeField: rule.time_field,
    schedule: {
      every: rule.schedule.every,
      lookback: rule.schedule.lookback ?? '1m',
    },
    query: apiQueryToFormQuery(rule.query),
    recovery: apiRecoveryToFormRecovery(rule.recovery),
    noData: apiNoDataToFormNoData(rule.no_data),
    ...(rule.grouping ? { grouping: { fields: rule.grouping.fields } } : {}),
    stateTransition,
    stateTransitionAlertDelayMode: deriveAlertDelayModeFromStateTransition(stateTransition),
    stateTransitionRecoveryDelayMode: deriveRecoveryDelayModeFromStateTransition(stateTransition),
    ...splitArtifactsByType(rule.artifacts),
  };
};
