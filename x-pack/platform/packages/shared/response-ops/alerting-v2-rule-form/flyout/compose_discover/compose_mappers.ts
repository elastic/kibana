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
import { toUpdateRuleData } from '../../form/utils/rule_request_mappers';
import {
  apiStateTransitionToFormStateTransition,
  buildStateTransitionRequest,
  deriveAlertDelayModeFromStateTransition,
  deriveRecoveryDelayModeFromStateTransition,
} from '../../form/utils/state_transition_helpers';
import {
  apiNoDataToFormNoData,
  apiRecoveryToFormRecovery,
  formNoDataToApiNoData,
  formRecoveryToApiRecovery,
} from '../../form/utils/lifecycle_mappers';
import type { FormValues } from '../../form/types';

export const composeFormToCreateRequest = (
  formValues: FormValues,
  builderType?: string,
  builderFields?: Record<string, unknown>
): CreateRuleData => {
  const artifacts = mapArtifacts(mergeArtifactsByType(formValues));
  const recovery = formRecoveryToApiRecovery(formValues);
  const noData = formNoDataToApiNoData(formValues);

  return {
    kind: formValues.kind,
    metadata: {
      name: formValues.metadata.name,
      ...(formValues.metadata.description ? { description: formValues.metadata.description } : {}),
      ...(formValues.metadata.tags?.length ? { tags: formValues.metadata.tags } : {}),
      ...(formValues.metadata.routingTags?.length
        ? { routing_tags: formValues.metadata.routingTags }
        : {}),
      ...(builderType ? { builder: { type: builderType } } : {}),
      ...(builderFields ? { builder_fields: builderFields } : {}),
    },
    time_field: formValues.timeField,
    schedule: { every: formValues.schedule.every, lookback: formValues.schedule.lookback },
    ...(builderFields ? {} : { query: ruleQueryToApiQuery(formValues.query) }),
    ...(recovery ? { recovery } : {}),
    ...(noData ? { no_data: noData } : {}),
    grouping: formValues.grouping?.fields?.length
      ? { fields: formValues.grouping.fields }
      : undefined,
    state_transition: buildStateTransitionRequest(formValues),
    ...(artifacts ? { artifacts } : {}),
  };
};

export const composeFormToUpdateRequest = (
  formValues: FormValues,
  builderType?: string,
  builderFields?: Record<string, unknown>
): UpdateRuleData => {
  const { kind, ...request } = composeFormToCreateRequest(formValues, builderType, builderFields);
  // `toUpdateRuleData` maps a query unconditionally. A builder-authored body carries its fields
  // instead, and the server generates the query from them.
  const { query, ...update } = toUpdateRuleData({
    ...request,
    query: request.query ?? ruleQueryToApiQuery(formValues.query),
  });

  return {
    ...update,
    ...(request.query ? { query } : {}),
    metadata: {
      ...update.metadata,
      builder: request.metadata.builder ?? null,
      // Only clear builder_fields when leaving builder mode. When a builder
      // has no toFields yet (no builder_fields support), omit the key so the
      // server preserves whatever is already stored.
      ...(builderFields != null
        ? { builder_fields: builderFields }
        : !builderType
        ? { builder_fields: null }
        : {}),
    },
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
  const stateTransition = rule.state_transition
    ? apiStateTransitionToFormStateTransition(rule.state_transition)
    : undefined;

  return {
    kind: rule.kind,
    metadata: {
      name: rule.metadata.name,
      description: rule.metadata.description,
      enabled: rule.enabled,
      tags: rule.metadata.tags,
      routingTags: rule.metadata.routing_tags,
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
