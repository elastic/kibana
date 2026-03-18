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
import type { FormValues } from '../types';

// ---------------------------------------------------------------------------
// FormValues → API request
// ---------------------------------------------------------------------------

/**
 * Builds the `recovery_policy.query` portion of the API payload.
 *
 * Two modes:
 * 1. **Condition mode** – The user specified an evaluation condition (WHERE clause)
 *    and wrote a recovery condition. The base query for recovery is the same
 *    evaluation base query.
 * 2. **Full-query mode** – The user wrote a standalone recovery base query
 *    (no evaluation condition was split out).
 */
const buildRecoveryQuery = (
  recoveryPolicy: NonNullable<FormValues['recoveryPolicy']>,
  evaluation: FormValues['evaluation']
): { query: { base: string; condition?: string } } | Record<string, never> => {
  const { query } = recoveryPolicy;

  // Condition-only mode: recovery WHERE clause applied to the evaluation base query
  if (query?.condition) {
    return {
      query: {
        base: query.base || evaluation.query.base,
        condition: query.condition,
      },
    };
  }

  // Full-query mode: user provided a standalone recovery base query
  if (query?.base) {
    return { query: { base: query.base } };
  }

  return {};
};

const mapMetadata = (metadata: FormValues['metadata']) => ({
  name: metadata.name,
  description: metadata.description,
  owner: metadata.owner,
  labels: metadata.labels,
});

const mapSchedule = (schedule: FormValues['schedule']) => ({
  every: schedule.every,
  lookback: schedule.lookback,
});

const mapEvaluation = (evaluation: FormValues['evaluation']) => ({
  query: {
    base: evaluation.query.base,
    ...(evaluation.query.condition ? { condition: evaluation.query.condition } : {}),
  },
});

const mapGrouping = (grouping: FormValues['grouping']) =>
  grouping?.fields?.length ? { fields: grouping.fields } : undefined;

const mapRecoveryPolicy = (
  recoveryPolicy: FormValues['recoveryPolicy'],
  evaluation: FormValues['evaluation']
) => {
  if (!recoveryPolicy) return undefined;
  return {
    type: recoveryPolicy.type,
    ...(recoveryPolicy.type === 'query' ? buildRecoveryQuery(recoveryPolicy, evaluation) : {}),
  };
};

const mapStateTransition = (
  kind: FormValues['kind'],
  stateTransition: FormValues['stateTransition']
) => {
  if (kind !== 'alert' || stateTransition == null) return undefined;

  const hasPending =
    stateTransition.pendingCount != null || stateTransition.pendingTimeframe != null;
  const hasRecovering =
    stateTransition.recoveringCount != null || stateTransition.recoveringTimeframe != null;

  if (!hasPending && !hasRecovering) return undefined;

  return {
    ...(stateTransition.pendingCount != null
      ? { pending_count: stateTransition.pendingCount }
      : {}),
    ...(stateTransition.pendingTimeframe != null
      ? { pending_timeframe: stateTransition.pendingTimeframe }
      : {}),
    ...(stateTransition.recoveringCount != null
      ? { recovering_count: stateTransition.recoveringCount }
      : {}),
    ...(stateTransition.recoveringTimeframe != null
      ? { recovering_timeframe: stateTransition.recoveringTimeframe }
      : {}),
  };
};

/**
 * Common rule request shape shared between create and update payloads.
 * Contains all fields except `kind` (only required for create).
 */
export interface RuleRequestCommon {
  metadata: { name: string; description?: string; owner?: string; labels?: string[] };
  time_field: string;
  schedule: { every: string; lookback?: string };
  evaluation: { query: { base: string; condition?: string } };
  grouping?: { fields: string[] };
  recovery_policy?: { type: RecoveryPolicyType; query?: { base?: string; condition?: string } };
  state_transition?: {
    pending_count?: number;
    pending_timeframe?: string;
    recovering_count?: number;
    recovering_timeframe?: string;
  };
}

/**
 * Maps `FormValues` to the common API request shape (snake_case) shared by
 * both create and update endpoints. Does not include `kind`.
 */
export const mapFormValuesToRuleRequest = (formValues: FormValues): RuleRequestCommon => {
  const {
    metadata,
    timeField,
    schedule,
    evaluation,
    grouping,
    recoveryPolicy,
    stateTransition,
    kind,
  } = formValues;

  return {
    metadata: mapMetadata(metadata),
    time_field: timeField,
    schedule: mapSchedule(schedule),
    evaluation: mapEvaluation(evaluation),
    grouping: mapGrouping(grouping),
    recovery_policy: mapRecoveryPolicy(recoveryPolicy, evaluation),
    state_transition: mapStateTransition(kind, stateTransition),
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
  const { grouping, recovery_policy, state_transition, ...rest } =
    mapFormValuesToRuleRequest(formValues);

  return {
    ...rest,
    grouping: grouping ?? null,
    recovery_policy: recovery_policy ?? null,
    state_transition: state_transition ?? null,
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
export const mapRuleResponseToFormValues = (rule: RuleResponse): Partial<FormValues> => ({
  kind: rule.kind,
  metadata: {
    name: rule.metadata.name,
    description: rule.metadata.description,
    enabled: rule.enabled,
    owner: rule.metadata.owner,
    labels: rule.metadata.labels,
  },
  timeField: rule.time_field,
  schedule: {
    every: rule.schedule.every,
    lookback: rule.schedule.lookback ?? '1m',
  },
  evaluation: {
    query: {
      base: rule.evaluation.query.base,
      condition: rule.evaluation.query.condition,
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
                  condition: rule.recovery_policy.query.condition,
                },
              }
            : {}),
        },
      }
    : {}),
  ...(rule.state_transition
    ? {
        stateTransition: {
          pendingCount: rule.state_transition.pending_count,
          pendingTimeframe: rule.state_transition.pending_timeframe,
          recoveringCount: rule.state_transition.recovering_count,
          recoveringTimeframe: rule.state_transition.recovering_timeframe,
        },
      }
    : {}),
});
