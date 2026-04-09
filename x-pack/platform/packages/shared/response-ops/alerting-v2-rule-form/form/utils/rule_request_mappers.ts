/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleResponse,
  RecoveryPolicyType,
  CreateRuleData,
  UpdateRuleData,
} from '@kbn/alerting-v2-schemas';
import { RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import type { FormValues, StateTransition } from '../types';

const createRunbookArtifactId = () =>
  `runbook-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
type RuleArtifactPayload = Array<{ id: string; type: string; value: string }>;

// ---------------------------------------------------------------------------
// FormValues → API request
// ---------------------------------------------------------------------------

/**
 * Builds the `recovery_policy.query` portion of the API payload.
 *
 * Only full-query mode is supported: the user provides a standalone recovery
 * base query.
 */
const buildRecoveryQuery = (
  recoveryPolicy: NonNullable<FormValues['recoveryPolicy']>
): { query: { base: string } } | Record<string, never> => {
  const { query } = recoveryPolicy;

  if (query?.base) {
    return { query: { base: query.base } };
  }

  return {};
};

const mapMetadata = (metadata: FormValues['metadata']) => ({
  name: metadata.name,
  description: metadata.description,
  owner: metadata.owner,
  tags: metadata.tags,
});

const mapSchedule = (schedule: FormValues['schedule']) => ({
  every: schedule.every,
  lookback: schedule.lookback,
});

const mapEvaluation = (evaluation: FormValues['evaluation']) => ({
  query: {
    base: evaluation.query.base,
  },
});

const mapGrouping = (grouping: FormValues['grouping']) =>
  grouping?.fields?.length ? { fields: grouping.fields } : undefined;

const mapRecoveryPolicy = (recoveryPolicy: FormValues['recoveryPolicy']) => {
  if (!recoveryPolicy) return undefined;
  return {
    type: recoveryPolicy.type,
    ...(recoveryPolicy.type === 'query' ? buildRecoveryQuery(recoveryPolicy) : {}),
  };
};

/** Derives alert-delay mode from persisted `state_transition` (same rules as `AlertDelayField`). */
export const deriveAlertDelayModeFromStateTransition = (
  stateTransition?: StateTransition | null
): FormValues['stateTransitionAlertDelayMode'] => {
  if (stateTransition?.pendingTimeframe != null) return 'duration';
  if (stateTransition?.pendingCount != null) return 'breaches';
  return 'immediate';
};

/** Derives recovery-delay mode from persisted `state_transition` (same rules as `RecoveryDelayField`). */
export const deriveRecoveryDelayModeFromStateTransition = (
  stateTransition?: StateTransition | null
): FormValues['stateTransitionRecoveryDelayMode'] => {
  if (stateTransition?.recoveringTimeframe != null) return 'duration';
  if (stateTransition?.recoveringCount != null) return 'recoveries';
  return 'immediate';
};

const mapStateTransition = (formValues: FormValues) => {
  const { kind, stateTransition } = formValues;
  if (kind !== 'alert' || stateTransition == null) return undefined;

  const alertMode =
    formValues.stateTransitionAlertDelayMode ??
    deriveAlertDelayModeFromStateTransition(stateTransition);
  const recoveryMode =
    formValues.stateTransitionRecoveryDelayMode ??
    deriveRecoveryDelayModeFromStateTransition(stateTransition);

  const out: NonNullable<RuleRequestCommon['state_transition']> = {};

  if (alertMode !== 'immediate') {
    if (alertMode === 'breaches' && stateTransition.pendingCount != null) {
      out.pending_count = stateTransition.pendingCount;
    }
    if (alertMode === 'duration') {
      if (stateTransition.pendingTimeframe != null) {
        out.pending_timeframe = stateTransition.pendingTimeframe;
      }
      if (stateTransition.pendingCount != null) {
        out.pending_count = stateTransition.pendingCount;
      }
    }
  }

  if (recoveryMode !== 'immediate') {
    if (recoveryMode !== 'duration' && stateTransition.recoveringCount != null) {
      out.recovering_count = stateTransition.recoveringCount;
    }
    if (recoveryMode === 'duration') {
      if (stateTransition.recoveringTimeframe != null) {
        out.recovering_timeframe = stateTransition.recoveringTimeframe;
      }
      if (stateTransition.recoveringCount != null) {
        out.recovering_count = stateTransition.recoveringCount;
      }
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
  evaluation: { query: { base: string } };
  grouping?: { fields: string[] };
  recovery_policy?: { type: RecoveryPolicyType; query?: { base?: string } };
  state_transition?: {
    pending_count?: number;
    pending_timeframe?: string;
    recovering_count?: number;
    recovering_timeframe?: string;
  };
  artifacts?: RuleArtifactPayload;
}

const mapArtifacts = (artifacts: FormValues['artifacts']): RuleRequestCommon['artifacts'] => {
  const currentArtifacts = artifacts ?? [];
  const runbookArtifact = currentArtifacts.find(
    (artifact) => artifact.type === RUNBOOK_ARTIFACT_TYPE
  );
  const runbookValue = runbookArtifact?.value.trim();

  if (runbookArtifact && !runbookValue) {
    const artifactsWithoutRunbook = currentArtifacts.filter(
      (artifact) => artifact.type !== RUNBOOK_ARTIFACT_TYPE
    );
    return artifactsWithoutRunbook.length ? artifactsWithoutRunbook : undefined;
  }

  if (runbookArtifact && runbookValue) {
    const runbookId = runbookArtifact.id.trim() ? runbookArtifact.id : createRunbookArtifactId();
    if (runbookArtifact.value === runbookValue && runbookArtifact.id === runbookId) {
      return currentArtifacts.length ? currentArtifacts : undefined;
    }

    return currentArtifacts.map((artifact) =>
      artifact.type === RUNBOOK_ARTIFACT_TYPE
        ? { ...artifact, id: runbookId, value: runbookValue }
        : artifact
    );
  }

  return currentArtifacts.length ? currentArtifacts : undefined;
};

/**
 * Maps `FormValues` to the common API request shape (snake_case) shared by
 * both create and update endpoints. Does not include `kind`.
 */
export const mapFormValuesToRuleRequest = (formValues: FormValues): RuleRequestCommon => {
  const { metadata, timeField, schedule, evaluation, grouping, recoveryPolicy, artifacts } =
    formValues;
  const mappedArtifacts = mapArtifacts(artifacts);

  return {
    metadata: mapMetadata(metadata),
    time_field: timeField,
    schedule: mapSchedule(schedule),
    evaluation: mapEvaluation(evaluation),
    grouping: mapGrouping(grouping),
    recovery_policy: mapRecoveryPolicy(recoveryPolicy),
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
  const { grouping, recovery_policy, state_transition, artifacts, ...rest } =
    mapFormValuesToRuleRequest(formValues);

  return {
    ...rest,
    grouping: grouping ?? null,
    recovery_policy: recovery_policy ?? null,
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
    evaluation: {
      query: {
        base: rule.evaluation.query.base,
      },
    },
    ...(rule.grouping ? { grouping: { fields: rule.grouping.fields } } : {}),
    ...(rule.recovery_policy
      ? {
          recoveryPolicy: {
            type: rule.recovery_policy.type,
            ...(rule.recovery_policy.query
              ? {
                  query: {
                    base: rule.recovery_policy.query.base,
                  },
                }
              : {}),
          },
        }
      : {}),
    stateTransition,
    stateTransitionAlertDelayMode: deriveAlertDelayModeFromStateTransition(stateTransition),
    stateTransitionRecoveryDelayMode: deriveRecoveryDelayModeFromStateTransition(stateTransition),
    ...(rule.artifacts ? { artifacts: rule.artifacts } : {}),
  };
};
