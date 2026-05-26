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
import type {
  ComposeFormValues,
  RuleQuery,
  RuleKind,
  RecoveryPolicyType,
} from './compose_form_types';
import { splitQuery } from './use_heuristic_split';

// ---------------------------------------------------------------------------
// Schema bridge: RuleQuery <-> old API fields
//
// TEMPORARY — remove when #268984 merges and the API natively uses the
// composed/standalone query schema.
// ---------------------------------------------------------------------------

/**
 * Converts old API response fields into a `RuleQuery`.
 *
 * Uses `splitQuery()` to re-derive the base/block split from the stored
 * single query string. Lossy if the user hand-edited the split, but acceptable
 * during active dev — the new schema stores the split natively.
 */
export function transformQueryIn(rule: {
  kind: RuleKind;
  evaluation: { query: { base: string; no_data?: string } };
  recovery_policy?: { type: string; query?: { base?: string } } | null;
}): RuleQuery {
  const fullQuery = rule.evaluation.query.base;

  if (rule.kind === 'signal') {
    return {
      format: 'standalone',
      breach: fullQuery,
      ...(rule.evaluation.query.no_data ? { no_data: rule.evaluation.query.no_data } : {}),
    };
  }

  const { base, alertBlock: block } = splitQuery(fullQuery);

  let recover: string | undefined;
  if (rule.recovery_policy?.type === 'query' && rule.recovery_policy.query?.base) {
    const { alertBlock: recoveryBlock } = splitQuery(rule.recovery_policy.query.base);
    recover = recoveryBlock || undefined;
  }

  return {
    format: 'composed',
    base,
    blocks: {
      breach: block,
      ...(recover ? { recover } : {}),
    },
  };
}

interface RecoveryPolicyOut {
  type: RecoveryPolicyType;
  query?: { base: string };
}

export interface TransformQueryOutResult {
  evaluation: { query: { base: string } };
  recovery_policy?: RecoveryPolicyOut;
}

/**
 * Converts a `RuleQuery` back into the old API fields.
 */
export function transformQueryOut(query: RuleQuery, kind?: RuleKind): TransformQueryOutResult {
  if (query.format === 'standalone') {
    const evaluation = {
      query: {
        base: query.breach,
        ...(query.no_data ? { no_data: query.no_data } : {}),
      },
    };
    const recoverStr = query.recover?.trim();
    if (recoverStr) {
      return {
        evaluation,
        recovery_policy: { type: 'query', query: { base: recoverStr } },
      };
    }
    if (kind === 'alert') {
      return { evaluation, recovery_policy: { type: 'no_breach' } };
    }
    return { evaluation };
  }

  const evalQuery = [query.base, query.blocks.breach].filter(Boolean).join('\n');

  const result: TransformQueryOutResult = { evaluation: { query: { base: evalQuery } } };

  if (query.blocks.recover?.trim()) {
    const recoveryQuery = [query.base, query.blocks.recover].filter(Boolean).join('\n');
    result.recovery_policy = { type: 'query', query: { base: recoveryQuery } };
  } else {
    result.recovery_policy = { type: 'no_breach' };
  }

  return result;
}

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

export const composeFormToCreateRequest = (
  formValues: ComposeFormValues,
  builderType?: string
): CreateRuleData => {
  const { evaluation, recovery_policy } = transformQueryOut(formValues.query, formValues.kind);
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
    evaluation,
    grouping: formValues.grouping?.fields?.length
      ? { fields: formValues.grouping.fields }
      : undefined,
    recovery_policy,
    state_transition: mapStateTransition(formValues),
    ...(artifacts ? { artifacts } : {}),
  };
};

export const composeFormToUpdateRequest = (
  formValues: ComposeFormValues,
  builderType?: string
): UpdateRuleData => {
  const { kind, ...request } = composeFormToCreateRequest(formValues, builderType);
  const { grouping, recovery_policy, state_transition, artifacts, metadata, ...rest } = request;
  return {
    ...rest,
    metadata: {
      ...metadata,
      builder_type: metadata.builder_type ?? null,
    },
    grouping: grouping ?? null,
    recovery_policy: recovery_policy ?? null,
    state_transition: state_transition ?? null,
    artifacts: artifacts ?? null,
  };
};

// ---------------------------------------------------------------------------
// API response → ComposeFormValues
// ---------------------------------------------------------------------------

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
    query: transformQueryIn(rule),
    ...(rule.grouping ? { grouping: { fields: rule.grouping.fields } } : {}),
    stateTransition,
    stateTransitionAlertDelayMode: deriveAlertDelayMode(stateTransition),
    stateTransitionRecoveryDelayMode: deriveRecoveryDelayMode(stateTransition),
    ...splitArtifactsByType(rule.artifacts),
  };
};
