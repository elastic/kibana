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
  UpdateRuleData,
  RuleResponse,
  ImmutableRuleField,
} from '@kbn/alerting-v2-schemas';
import {
  IMMUTABLE_RULE_FIELDS,
  isNoDataQueryConsistentWithStrategy,
  isNoDataQueryProvidedForStrategy,
  isRecoveryQueryConsistentWithStrategy,
  isRecoveryQueryProvidedForStrategy,
  isSignalQueryBreachOnly,
  isSignalUsingStandaloneFormat,
} from '@kbn/alerting-v2-schemas';

import { type RuleSavedObjectAttributes } from '../../saved_objects';
import { ALERTING_V2_ERROR_CODES } from '../errors/error_codes';

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
      // `null` clears all tags. The SO schema is `maybe(...)` without
      // `nullable()`, so the cleared value must be stored as `undefined`.
      tags: nullToUndefined(updateData.metadata?.tags, existingAttrs.metadata.tags),
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
    enabled: updateData.enabled ?? existingAttrs.enabled,
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
      valid: isSignalUsingStandaloneFormat(attrs),
      message: 'kind "signal" requires query.format "standalone".',
      code: ALERTING_V2_ERROR_CODES.INVALID_SIGNAL_RULE,
      details: { rule_id: ruleId, rule_kind: attrs.kind },
    },
    {
      valid: isSignalQueryBreachOnly(attrs),
      message: 'Signal rules cannot set recovery_strategy or no_data_strategy.',
      code: ALERTING_V2_ERROR_CODES.INVALID_SIGNAL_RULE,
      details: { rule_id: ruleId, rule_kind: attrs.kind },
    },
    {
      valid: isRecoveryQueryConsistentWithStrategy(attrs),
      message: 'query.recovery is only allowed when recovery_strategy is "query".',
      code: ALERTING_V2_ERROR_CODES.INVALID_RULE_QUERY_CONFIG,
      details: { rule_id: ruleId },
    },
    {
      valid: isRecoveryQueryProvidedForStrategy(attrs),
      message: 'query.recovery is required when recovery_strategy is "query".',
      code: ALERTING_V2_ERROR_CODES.INVALID_RULE_QUERY_CONFIG,
      details: { rule_id: ruleId },
    },
    {
      valid: isNoDataQueryConsistentWithStrategy(attrs),
      message: 'query.no_data is only allowed when no_data_strategy is set to a non-"none" value.',
      code: ALERTING_V2_ERROR_CODES.INVALID_RULE_QUERY_CONFIG,
      details: { rule_id: ruleId },
    },
    {
      valid: isNoDataQueryProvidedForStrategy(attrs),
      message:
        'query.no_data is required when no_data_strategy is not "none" for standalone-format rules.',
      code: ALERTING_V2_ERROR_CODES.INVALID_RULE_QUERY_CONFIG,
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
