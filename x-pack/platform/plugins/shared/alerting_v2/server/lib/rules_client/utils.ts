/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isEqual } from 'lodash';
import type {
  CreateRuleData,
  CreateRuleDataInput,
  RuleResponse,
  UpdateRuleData,
} from '@kbn/alerting-v2-schemas';
import { treeifyError } from '@kbn/zod/v4';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import {
  createRuleDataBaseSchema,
  IMMUTABLE_RULE_FIELDS,
  isAbsenceDistinguishableFromBreach,
  isLifecycleConfigAllowedForKind,
  isLifecycleConfigPresentForKind,
  isRecoveryConditionUsableWithBreach,
  isRoutingTagsAllowedForKind,
  REQUIRE_DISTINGUISHABLE_ABSENCE_MESSAGE,
  ROUTING_TAGS_SIGNAL_RULE_MESSAGE,
  isRecoveryTransitionConsistentWithStrategy,
  recoveryStrategy,
  validateComposedEsqlQuery,
  type ImmutableRuleField,
} from '@kbn/alerting-v2-schemas';
import { TaskStatus } from '@kbn/task-manager-plugin/server';

import { type RuleSavedObjectAttributes } from '../../saved_objects';
import { applyPatch } from '../apply_patch';
import {
  toApiArtifacts,
  toApiDescription,
  toApiGrouping,
  toApiQuery,
  toApiStateTransition,
} from '../../saved_objects/legacy_rule_shape';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { getInvalidRuleDataMessage } from '../errors/rule_error_messages';
import { RULE_VERSION_FALLBACK } from '../rule_changes_history';
import type { BulkOperationError, RotationCandidate } from './types';

/**
 * Maps a saved-object status code to the stable, machine-readable bulk-error
 * `code` returned in the response body. Keeps the by-ID and by-query endpoints
 * aligned with the single-rule error codes so a client can dispatch on
 * `error.code` uniformly.
 */
export const bulkErrorCodeForStatus = (statusCode: number): string => {
  if (statusCode === 404) {
    return ALERTING_ERROR_CODES.RULE_NOT_FOUND;
  }
  if (statusCode === 409) {
    return ALERTING_ERROR_CODES.RULE_VERSION_CONFLICT;
  }
  return ALERTING_ERROR_CODES.INTERNAL_SERVER_ERROR;
};

/**
 * Optional `details` payload carrying the rule's display name so the client can
 * identify the affected rule without a follow-up fetch (the id alone is opaque
 * in the UI). Omitted when the name is unknown — e.g. a rule that failed to
 * fetch (`RULE_NOT_FOUND`) — so the client falls back to the id.
 */
const nameDetails = (name?: string) => (name ? { details: { name } } : {});

export const toBulkError = (
  id: string,
  err: { statusCode: number; message: string },
  name?: string
): BulkOperationError => ({
  id,
  error: {
    code: bulkErrorCodeForStatus(err.statusCode),
    message: err.message,
    ...nameDetails(name),
  },
});

/**
 * Groups rotation candidates by their schedule interval. `bulkUpdateSchedules`
 * takes a single schedule per call, so each interval becomes one call (and
 * passing each group its own interval leaves the schedule unchanged).
 */
export const groupCandidatesByInterval = (
  candidates: RotationCandidate[]
): Map<string, RotationCandidate[]> => {
  const byInterval = new Map<string, RotationCandidate[]>();
  for (const candidate of candidates) {
    const interval = candidate.attrs.schedule.every;
    const group = byInterval.get(interval) ?? [];
    group.push(candidate);
    byInterval.set(interval, group);
  }
  return byInterval;
};

/** Per-rule error for a disabled rule — it has no executor task/key to rotate. */
export const ruleDisabledError = (ruleId: string, name?: string): BulkOperationError => ({
  id: ruleId,
  error: {
    code: ALERTING_ERROR_CODES.RULE_DISABLED,
    message: `Rule with id "${ruleId}" is disabled and has no API key to update`,
    ...nameDetails(name),
  },
});

/**
 * Whether a skipped executor task is worth a retry. `bulkUpdateSchedules` only
 * touches `idle` tasks, so a skipped task is in some non-idle state — but only a
 * mid-run task (`running`/`claiming`) frees up on its own and rotates on the
 * next attempt. A `failed`/`unrecognized`/`dead_letter`/`should_delete` task
 * will not, so it must not be reported as `RULE_ALREADY_RUNNING` ("try again
 * once it finishes"), which would be misleading.
 */
export const isTaskMidRun = (status?: TaskStatus): boolean =>
  status === TaskStatus.Running || status === TaskStatus.Claiming;

/** Per-rule error for a rule whose executor task is mid-run and was skipped. */
export const ruleRunningError = (ruleId: string, name?: string): BulkOperationError => ({
  id: ruleId,
  error: {
    code: ALERTING_ERROR_CODES.RULE_ALREADY_RUNNING,
    message: `Rule with id "${ruleId}" is currently running; its API key cannot be updated until the run finishes`,
    ...nameDetails(name),
  },
});

/**
 * Per-rule error for a rule whose executor task key rotation failed — either a
 * per-task failure (`statusCode` from Task Manager) or a whole-group failure
 * (no `statusCode` → `INTERNAL_SERVER_ERROR`).
 */
export const rotationFailedError = (
  ruleId: string,
  statusCode?: number,
  name?: string
): BulkOperationError => ({
  id: ruleId,
  error: {
    code: bulkErrorCodeForStatus(statusCode ?? 500),
    message: `Failed to update the executor task API key for rule "${ruleId}"`,
    ...nameDetails(name),
  },
});

/**
 * Source-of-truth helpers driven by {@link IMMUTABLE_RULE_FIELDS}. They keep
 * `upsertRule` (PUT — rejects mutation) and `buildUpdateRuleAttributes`
 * (PATCH — silently preserves) honest as the rule schema evolves: adding a
 * new immutable field only requires updating the registry in
 * `@kbn/alerting-v2-schemas`.
 */

/**
 * Throws `Boom.conflict` if the parsed request body tries to change any
 * field declared immutable in {@link IMMUTABLE_RULE_FIELDS}. Intended for
 * PUT-style upsert callers that send a full resource. All changed fields
 * are reported in a single error so the client sees the full diff.
 */
export function assertImmutableUnchanged(
  parsed: Pick<CreateRuleData, ImmutableRuleField>,
  existing: Pick<RuleSavedObjectAttributes, ImmutableRuleField>
): void {
  const changed = IMMUTABLE_RULE_FIELDS.filter((field) => !isEqual(parsed[field], existing[field]));
  if (changed.length > 0) {
    throw Boom.conflict(`Some fields cannot be changed after creation: ${changed.join(', ')}.`, {
      code: ALERTING_ERROR_CODES.IMMUTABLE_FIELDS_CHANGED,
      details: { fields: changed },
    });
  }
}

/**
 * Returns just the immutable fields from `attrs`, suitable for spreading at
 * the end of an attribute builder so subsequent code cannot accidentally
 * overwrite them.
 */
export function pickImmutable(
  attrs: Pick<RuleSavedObjectAttributes, ImmutableRuleField>
): Pick<RuleSavedObjectAttributes, ImmutableRuleField> {
  return Object.fromEntries(IMMUTABLE_RULE_FIELDS.map((field) => [field, attrs[field]])) as Pick<
    RuleSavedObjectAttributes,
    ImmutableRuleField
  >;
}

/**
 * Applies a patch value to a stored array: `null` clears it, an absent key keeps what is stored.
 * Neither a clear nor a legacy empty list is written back, since the rule schemas reject an empty
 * array and "no items" is always an absent key.
 */
const patchArray = <T>(
  value: T[] | null | undefined,
  existing: T[] | undefined
): T[] | undefined => {
  if (value === null) return undefined;
  if (value === undefined) return existing?.length ? existing : undefined;
  return value;
};

/**
 * The lifecycle objects an alert rule is stored with. The request schema
 * requires both for `kind: alert`, so there is nothing to default. Signal
 * rules have no episodes, so they store neither regardless of what was sent.
 */
const toStoredLifecycle = (
  data: Pick<CreateRuleData, 'kind' | 'recovery' | 'no_data'>
): Pick<RuleSavedObjectAttributes, 'recovery' | 'no_data'> =>
  data.kind === 'alert' ? { recovery: data.recovery, no_data: data.no_data } : {};

/**
 * Converts a create-rule API body into saved object attributes.
 */
export function transformCreateRuleBodyToRuleSoAttributes(
  data: CreateRuleData,
  serverFields: {
    enabled: boolean;
    createdBy: RuleSavedObjectAttributes['createdBy'];
    createdAt: string;
    updatedBy: RuleSavedObjectAttributes['updatedBy'];
    updatedAt: string;
    version: number;
    template?: RuleSavedObjectAttributes['metadata']['template'];
  }
): RuleSavedObjectAttributes {
  const { template, ...fields } = serverFields;

  return {
    kind: data.kind,
    metadata: {
      name: data.metadata.name,
      description: data.metadata.description,
      tags: data.metadata.tags,
      routing_tags: data.metadata.routing_tags,
      builder_type: data.metadata.builder?.type,
      template,
    },
    time_field: data.time_field,
    schedule: {
      every: data.schedule.every,
      lookback: data.schedule.lookback,
    },
    query: data.query,
    ...toStoredLifecycle(data),
    state_transition: data.state_transition,
    grouping: data.grouping,
    artifacts: data.artifacts,
    ...fields,
  };
}

/**
 * Resolves `metadata.builder` for an update.
 *
 * Builder rules require an explicit `metadata.builder: null` in the request
 * to clear the field when the query changes.
 */
function resolveBuilderType(
  updateData: UpdateRuleData,
  existingAttrs: RuleSavedObjectAttributes
): string | undefined {
  if (updateData.metadata?.builder !== undefined) {
    return updateData.metadata.builder?.type;
  }

  const queryChanged =
    updateData.query !== undefined && !isEqual(updateData.query, toApiQuery(existingAttrs.query));

  if (queryChanged && existingAttrs.metadata.builder_type) {
    throw Boom.badRequest(
      'Cannot update the query on a builder rule without explicitly clearing ' +
        'metadata.builder. Send metadata.builder: null to confirm the transition to ES|QL mode.',
      { code: ALERTING_ERROR_CODES.BUILDER_TYPE_NOT_CLEARED }
    );
  }

  if (queryChanged) {
    return undefined;
  }

  return existingAttrs.metadata.builder_type;
}

/**
 * The create-shaped view of a stored rule, so a PATCH merges against the document a GET would
 * return rather than against whatever legacy shape happens to be on disk.
 */
const toPatchableRuleData = (attrs: RuleSavedObjectAttributes): CreateRuleDataInput => ({
  kind: attrs.kind,
  metadata: {
    name: attrs.metadata.name,
    description: toApiDescription(attrs.metadata.description),
    tags: attrs.metadata.tags,
    routing_tags: attrs.metadata.routing_tags,
    builder: attrs.metadata.builder_type ? { type: attrs.metadata.builder_type } : undefined,
  },
  time_field: attrs.time_field,
  schedule: { every: attrs.schedule.every, lookback: attrs.schedule.lookback },
  query: toApiQuery(attrs.query),
  recovery: attrs.recovery,
  no_data: attrs.no_data,
  state_transition: toApiStateTransition(attrs.state_transition),
  grouping: toApiGrouping(attrs.grouping),
  artifacts: toApiArtifacts(attrs.artifacts),
});

/**
 * Builds the complete next saved-object attributes for a rule update.
 *
 * The body is merged into the stored rule in API space, where an absent key means "unset", and the
 * result is parsed with the create schema so a merge that produces an invalid rule is rejected
 * rather than stored. Object leaves therefore merge independently, while arrays and discriminated
 * unions are replaced whole — a partial union member could never validate.
 *
 * The caller must persist these with `mergeAttributes: false`; the saved object's own deep merge
 * would resurrect the very leaves a `null` was sent to clear.
 */
export function buildUpdateRuleAttributes(
  existingAttrs: RuleSavedObjectAttributes,
  updateData: UpdateRuleData,
  serverFields: {
    updatedBy: RuleSavedObjectAttributes['updatedBy'];
    updatedAt: string;
    version: number;
  }
): RuleSavedObjectAttributes {
  // `resolveBuilderType` owns this leaf: it guards the builder-rule to ES|QL transition.
  const builderType = resolveBuilderType(updateData, existingAttrs);

  const merged = applyPatch(createRuleDataBaseSchema, toPatchableRuleData(existingAttrs), {
    ...updateData,
    metadata: { ...updateData.metadata, builder: builderType ? { type: builderType } : null },
  });

  const parsed = createRuleDataBaseSchema.safeParse(merged);
  if (!parsed.success) {
    throw Boom.badRequest(getInvalidRuleDataMessage('update', stringifyZodError(parsed.error)), {
      code: ALERTING_ERROR_CODES.INVALID_RULE_DATA,
      details: { context: 'update', errors: treeifyError(parsed.error) },
    });
  }

  const next = parsed.data;

  return {
    metadata: {
      name: next.metadata.name,
      description: next.metadata.description,
      tags: next.metadata.tags,
      routing_tags: next.metadata.routing_tags,
      builder_type: next.metadata.builder?.type,
    },
    time_field: next.time_field,
    schedule: { every: next.schedule.every, lookback: next.schedule.lookback },
    query: next.query,
    // Carried through even when the merged rule may not keep them: `validateMergedRuleAttributes`
    // reports an illegal lifecycle for the rule's kind rather than quietly discarding it.
    recovery: next.recovery,
    no_data: next.no_data,
    state_transition: next.state_transition,
    grouping: next.grouping,
    artifacts: patchArray(updateData.artifacts, existingAttrs.artifacts),
    // `enabled` is never writable via update — lifecycle transitions are owned exclusively by
    // enableRule/disableRule, so the stored value is preserved.
    enabled: existingAttrs.enabled,
    createdBy: existingAttrs.createdBy,
    createdAt: existingAttrs.createdAt,
    ...serverFields,
    // Immutable fields are forced from storage last, so no preceding override
    // can leak through if someone adds a new immutable field to the registry.
    ...pickImmutable(existingAttrs),
  };
}

/**
 * Re-checks the create schema's cross-field invariants against the merged
 * update attributes (the update body alone can't, since `kind` is immutable and
 * `query`/strategy fields update independently). Throws on the first violation.
 *
 * Excludes the `state_transition`/`kind` invariant, which `RulesClient`
 * validates against the update body directly.
 */
export function validateMergedRuleAttributes(
  ruleId: string,
  attrs: RuleSavedObjectAttributes
): void {
  const invariants: Array<{
    valid: boolean;
    message: string;
    code: string;
    details: Record<string, unknown>;
  }> = [
    {
      valid: isLifecycleConfigAllowedForKind(attrs),
      message: 'Signal rules cannot set recovery or no_data.',
      code: ALERTING_ERROR_CODES.INVALID_SIGNAL_RULE,
      details: { rule_id: ruleId, rule_kind: attrs.kind },
    },
    {
      valid: isRoutingTagsAllowedForKind(attrs),
      message: ROUTING_TAGS_SIGNAL_RULE_MESSAGE,
      code: ALERTING_ERROR_CODES.INVALID_SIGNAL_RULE,
      details: { rule_id: ruleId, rule_kind: attrs.kind },
    },
    {
      valid: isLifecycleConfigPresentForKind(attrs),
      message: 'Alert rules must set both recovery and no_data.',
      code: ALERTING_ERROR_CODES.INVALID_ALERT_RULE,
      details: { rule_id: ruleId, rule_kind: attrs.kind },
    },
    {
      valid: isRecoveryConditionUsableWithBreach(attrs),
      message: 'recovery.strategy "condition" requires query.breach.',
      code: ALERTING_ERROR_CODES.INVALID_RULE_QUERY_CONFIG,
      details: { rule_id: ruleId },
    },
    {
      valid: isAbsenceDistinguishableFromBreach(attrs),
      message: REQUIRE_DISTINGUISHABLE_ABSENCE_MESSAGE,
      code: ALERTING_ERROR_CODES.INVALID_RULE_QUERY_CONFIG,
      details: { rule_id: ruleId },
    },
    {
      valid: isMergedRecoverySegmentComposable(attrs),
      message: 'recovery.segment does not compose into a valid ES|QL query with query.base.',
      code: ALERTING_ERROR_CODES.INVALID_RULE_QUERY_CONFIG,
      details: { rule_id: ruleId },
    },
    {
      valid: isRecoveryTransitionConsistentWithStrategy(attrs),
      message: 'state_transition.recovering has no effect when recovery.strategy is "manual".',
      code: ALERTING_ERROR_CODES.INVALID_STATE_TRANSITION_CONFIG,
      details: { rule_id: ruleId },
    },
  ];

  for (const invariant of invariants) {
    if (!invariant.valid) {
      throw Boom.badRequest(invariant.message, {
        code: invariant.code,
        details: invariant.details,
      });
    }
  }
}

/**
 * `recovery.segment` and `query.base` can be updated independently, so the
 * create schema's composition check has to be repeated once they are merged.
 */
function isMergedRecoverySegmentComposable(attrs: RuleSavedObjectAttributes): boolean {
  if (attrs.recovery?.strategy !== recoveryStrategy.condition) {
    return true;
  }
  return validateComposedEsqlQuery(attrs.query.base, attrs.recovery.segment) == null;
}

/** Converts saved object attributes into the public API rule shape. */
export function transformRuleSoAttributesToRuleApiResponse(
  id: string,
  attrs: RuleSavedObjectAttributes
): RuleResponse {
  return {
    id,
    version: attrs.version ?? RULE_VERSION_FALLBACK,
    kind: attrs.kind,
    metadata: {
      name: attrs.metadata.name,
      description: toApiDescription(attrs.metadata.description),
      tags: attrs.metadata.tags,
      routing_tags: attrs.metadata.routing_tags,
      builder: attrs.metadata.builder_type ? { type: attrs.metadata.builder_type } : undefined,
      template: attrs.metadata.template,
    },
    time_field: attrs.time_field,
    schedule: {
      every: attrs.schedule.every,
      lookback: attrs.schedule.lookback,
    },
    query: toApiQuery(attrs.query),
    recovery: attrs.recovery,
    no_data: attrs.no_data,
    state_transition: toApiStateTransition(attrs.state_transition),
    grouping: toApiGrouping(attrs.grouping),
    artifacts: toApiArtifacts(attrs.artifacts),
    enabled: attrs.enabled,
    created_by: attrs.createdBy,
    created_at: attrs.createdAt,
    updated_by: attrs.updatedBy,
    updated_at: attrs.updatedAt,
  };
}
