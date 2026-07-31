/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isEqual } from 'lodash';
import type { CreateRuleData, UpdateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import { IMMUTABLE_RULE_FIELDS, type ImmutableRuleField } from '@kbn/alerting-v2-schemas';
import { TaskStatus } from '@kbn/task-manager-plugin/server';

import { type RuleSavedObjectAttributes } from '../../saved_objects';
import { ALERTING_V2_ERROR_CODES } from '../errors/error_codes';
import type { BulkOperationError, RotationCandidate } from './types';

/**
 * Maps a saved-object status code to the stable, machine-readable bulk-error
 * `code` returned in the response body. Keeps the by-ID and by-query endpoints
 * aligned with the single-rule error codes so a client can dispatch on
 * `error.code` uniformly.
 */
export const bulkErrorCodeForStatus = (statusCode: number): string => {
  if (statusCode === 404) {
    return ALERTING_V2_ERROR_CODES.RULE_NOT_FOUND;
  }
  if (statusCode === 409) {
    return ALERTING_V2_ERROR_CODES.RULE_VERSION_CONFLICT;
  }
  return ALERTING_V2_ERROR_CODES.INTERNAL_SERVER_ERROR;
};

export const toBulkError = (
  id: string,
  err: { statusCode: number; message: string }
): BulkOperationError => ({
  id,
  error: { code: bulkErrorCodeForStatus(err.statusCode), message: err.message },
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
export const ruleDisabledError = (ruleId: string): BulkOperationError => ({
  id: ruleId,
  error: {
    code: ALERTING_V2_ERROR_CODES.RULE_DISABLED,
    message: `Rule with id "${ruleId}" is disabled and has no API key to update`,
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
export const ruleRunningError = (ruleId: string): BulkOperationError => ({
  id: ruleId,
  error: {
    code: ALERTING_V2_ERROR_CODES.RULE_ALREADY_RUNNING,
    message: `Rule with id "${ruleId}" is currently running; its API key cannot be updated until the run finishes`,
  },
});

/**
 * Per-rule error for a rule whose executor task key rotation failed — either a
 * per-task failure (`statusCode` from Task Manager) or a whole-group failure
 * (no `statusCode` → `INTERNAL_SERVER_ERROR`).
 */
export const rotationFailedError = (ruleId: string, statusCode?: number): BulkOperationError => ({
  id: ruleId,
  error: {
    code: bulkErrorCodeForStatus(statusCode ?? 500),
    message: `Failed to update the executor task API key for rule "${ruleId}"`,
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
      code: ALERTING_V2_ERROR_CODES.IMMUTABLE_FIELDS_CHANGED,
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
 * For SO fields whose schema is `maybe(nullable(...))` — null is a valid
 * stored value meaning "explicitly cleared".
 */
function applyNullableUpdate<T>(
  value: T | null | undefined,
  existing: T | undefined
): T | null | undefined {
  if (value === undefined) return existing;
  return value; // null (clear) or new value (set)
}

/**
 * For SO fields whose schema is `maybe(...)` without `nullable()` — null
 * from the API means "clear", but must be stored as `undefined` (absent).
 */
function nullToUndefined<T>(value: T | null | undefined, existing: T | undefined): T | undefined {
  if (value === null) return undefined;
  if (value === undefined) return existing;
  return value;
}

function nullToEmptyArray<T>(
  value: T[] | null | undefined,
  existing: T[] | undefined
): T[] | undefined {
  if (value === null) return [];
  if (value === undefined) return existing;
  return value;
}

/**
 * Converts a create-rule API body into saved object attributes.
 *
 * Today this is a 1:1 mapping, but it gives us a seam to evolve storage
 * independently of the public API.
 */
export function transformCreateRuleBodyToRuleSoAttributes(
  data: CreateRuleData,
  serverFields: {
    enabled: boolean;
    createdBy: string | null;
    createdAt: string;
    updatedBy: string | null;
    updatedAt: string;
  }
): RuleSavedObjectAttributes {
  return {
    kind: data.kind,
    metadata: {
      name: data.metadata.name,
      description: data.metadata.description,
      owner: data.metadata.owner,
      tags: data.metadata.tags,
      builder_type: data.metadata.builder_type,
    },
    time_field: data.time_field,
    schedule: {
      every: data.schedule.every,
      lookback: data.schedule.lookback,
    },
    query: data.query,
    recovery_strategy: data.recovery_strategy,
    no_data_strategy: data.no_data_strategy,
    state_transition: data.state_transition,
    grouping: data.grouping,
    artifacts: data.artifacts,
    ...serverFields,
  };
}

/**
 * Resolves `metadata.builder_type` for an update. Auto-clears when the query
 * changes without an explicit `builder_type` in the same request.
 */
function resolveBuilderType(
  updateData: UpdateRuleData,
  existingAttrs: RuleSavedObjectAttributes
): string | undefined {
  if (updateData.metadata?.builder_type !== undefined) {
    return updateData.metadata.builder_type ?? undefined;
  }

  const queryChanged =
    updateData.query !== undefined && !isEqual(updateData.query, existingAttrs.query);
  const strategyChanged =
    (updateData.recovery_strategy !== undefined &&
      updateData.recovery_strategy !== existingAttrs.recovery_strategy) ||
    (updateData.no_data_strategy !== undefined &&
      updateData.no_data_strategy !== existingAttrs.no_data_strategy);

  if (queryChanged || strategyChanged) {
    return undefined;
  }

  return existingAttrs.metadata.builder_type;
}

/**
 * Builds the complete next saved-object attributes for a rule update.
 *
 * The caller is expected to persist these with `mergeAttributes: false` so
 * the SO client does not deep-merge nested objects (which would silently
 * preserve stale sub-fields).
 *
 * - `undefined` in the update payload → keeps the existing value.
 * - `null` → clears the field (`undefined` for `maybe()`-only fields,
 *   `null` for fields whose SO schema includes `nullable()`).
 */
export function buildUpdateRuleAttributes(
  existingAttrs: RuleSavedObjectAttributes,
  updateData: UpdateRuleData,
  serverFields: { updatedBy: string | null; updatedAt: string }
): RuleSavedObjectAttributes {
  return {
    ...existingAttrs,
    metadata: {
      ...existingAttrs.metadata,
      ...updateData.metadata,
      builder_type: resolveBuilderType(updateData, existingAttrs),
    },
    time_field: updateData.time_field ?? existingAttrs.time_field,
    schedule: { ...existingAttrs.schedule, ...updateData.schedule },
    // `query` - callers must send a complete new shape (we can't merge across formats),
    // so omitted = preserved, present = full replacement.
    query: updateData.query ?? existingAttrs.query,
    // `null` → clear (undefined). SO schema uses `maybe()` without `nullable()`.
    recovery_strategy: nullToUndefined(
      updateData.recovery_strategy,
      existingAttrs.recovery_strategy
    ),
    no_data_strategy: nullToUndefined(updateData.no_data_strategy, existingAttrs.no_data_strategy),
    // `null` → clear (null). SO schema uses `maybe(nullable())`.
    state_transition: applyNullableUpdate(
      updateData.state_transition,
      existingAttrs.state_transition
    ),
    // `null` → clear (undefined). SO schema uses `maybe()` without `nullable()`.
    grouping: nullToUndefined(updateData.grouping, existingAttrs.grouping),
    artifacts: nullToEmptyArray(updateData.artifacts, existingAttrs.artifacts),
    // `enabled` is never writable via update — lifecycle transitions are owned
    // exclusively by enableRule/disableRule, so the stored value is preserved.
    enabled: existingAttrs.enabled,
    // Server-managed fields — preserved as-is except timestamps and user.
    createdBy: existingAttrs.createdBy,
    createdAt: existingAttrs.createdAt,
    ...serverFields,
    // Immutable fields are forced from storage last, so no preceding override
    // can leak through if someone adds a new immutable field to the registry.
    ...pickImmutable(existingAttrs),
  };
}

/**
 * Converts saved object attributes into the public API response shape.
 */
export function transformRuleSoAttributesToRuleApiResponse(
  id: string,
  attrs: RuleSavedObjectAttributes,
  version?: string
): RuleResponse {
  return {
    id,
    version,
    kind: attrs.kind,
    metadata: {
      name: attrs.metadata.name,
      description: attrs.metadata.description,
      owner: attrs.metadata.owner,
      tags: attrs.metadata.tags,
      builder_type: attrs.metadata.builder_type,
    },
    time_field: attrs.time_field,
    schedule: {
      every: attrs.schedule.every,
      lookback: attrs.schedule.lookback,
    },
    query: attrs.query,
    recovery_strategy: attrs.recovery_strategy,
    no_data_strategy: attrs.no_data_strategy,
    state_transition: attrs.state_transition,
    grouping: attrs.grouping,
    artifacts: attrs.artifacts,
    enabled: attrs.enabled,
    createdBy: attrs.createdBy,
    createdAt: attrs.createdAt,
    updatedBy: attrs.updatedBy,
    updatedAt: attrs.updatedAt,
  };
}
