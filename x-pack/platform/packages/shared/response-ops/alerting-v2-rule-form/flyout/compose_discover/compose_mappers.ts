/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse, CreateRuleData, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import { RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import type { ComposeFormValues } from './compose_form_types';

// ---------------------------------------------------------------------------
// ComposeFormValues → API request
// ---------------------------------------------------------------------------

type RuleArtifactPayload = Array<{ id: string; type: string; value: string }>;

const createRunbookArtifactId = () =>
  `runbook-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const mapArtifacts = (
  artifacts: ComposeFormValues['artifacts']
): RuleArtifactPayload | undefined => {
  const currentArtifacts = artifacts ?? [];
  const runbookArtifact = currentArtifacts.find(
    (artifact) => artifact.type === RUNBOOK_ARTIFACT_TYPE
  );
  const runbookValue = runbookArtifact?.value.trim();

  if (runbookArtifact && !runbookValue) {
    const filtered = currentArtifacts.filter((a) => a.type !== RUNBOOK_ARTIFACT_TYPE);
    return filtered.length ? filtered : undefined;
  }
  if (runbookArtifact && runbookValue) {
    const runbookId = runbookArtifact.id.trim() ? runbookArtifact.id : createRunbookArtifactId();
    if (runbookArtifact.value === runbookValue && runbookArtifact.id === runbookId) {
      return currentArtifacts.length ? currentArtifacts : undefined;
    }
    return currentArtifacts.map((a) =>
      a.type === RUNBOOK_ARTIFACT_TYPE ? { ...a, id: runbookId, value: runbookValue } : a
    );
  }
  return currentArtifacts.length ? currentArtifacts : undefined;
};

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

export const composeFormToCreateRequest = (formValues: ComposeFormValues): CreateRuleData => {
  const artifacts = mapArtifacts(formValues.artifacts);

  return {
    kind: formValues.kind,
    metadata: {
      name: formValues.metadata.name,
      description: formValues.metadata.description,
      owner: formValues.metadata.owner,
      ...(formValues.metadata.tags?.length ? { tags: formValues.metadata.tags } : {}),
    },
    time_field: formValues.timeField,
    schedule: { every: formValues.schedule.every, lookback: formValues.schedule.lookback },
    query: formValues.query,
    grouping: formValues.grouping?.fields?.length
      ? { fields: formValues.grouping.fields }
      : undefined,
    state_transition: mapStateTransition(formValues),
    ...(artifacts ? { artifacts } : {}),
  };
};

export const composeFormToUpdateRequest = (formValues: ComposeFormValues): UpdateRuleData => {
  const { kind, ...request } = composeFormToCreateRequest(formValues);
  const { grouping, state_transition, artifacts, ...rest } = request;
  return {
    ...rest,
    grouping: grouping ?? null,
    state_transition: state_transition ?? null,
    artifacts: artifacts ?? null,
  };
};

// ---------------------------------------------------------------------------
// API response → ComposeFormValues
// ---------------------------------------------------------------------------

// The API's standalone query has an optional `no_data` field the compose form
// doesn't use — strip it so the result matches ComposeFormValues['query'].
const apiQueryToRuleQuery = (q: RuleResponse['query']): ComposeFormValues['query'] => {
  if (q.format === 'composed') return q;
  return { format: 'standalone', breach: q.breach, ...(q.recover ? { recover: q.recover } : {}) };
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
    ...(rule.artifacts ? { artifacts: rule.artifacts } : {}),
  };
};
