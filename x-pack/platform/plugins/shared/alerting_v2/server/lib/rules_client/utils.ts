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

import { type RuleSavedObjectAttributes } from '../../saved_objects';

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
    throw Boom.conflict(`Some fields cannot be changed after creation: ${changed.join(', ')}.`);
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
    },
    time_field: data.time_field,
    schedule: {
      every: data.schedule.every,
      lookback: data.schedule.lookback,
    },
    evaluation: {
      query: {
        base: data.evaluation.query.base,
      },
    },
    recovery_policy: data.recovery_policy,
    state_transition: data.state_transition,
    grouping: data.grouping,
    no_data: data.no_data,
    artifacts: data.artifacts,
    ...serverFields,
  };
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
    metadata: { ...existingAttrs.metadata, ...updateData.metadata },
    time_field: updateData.time_field ?? existingAttrs.time_field,
    schedule: { ...existingAttrs.schedule, ...updateData.schedule },
    evaluation: updateData.evaluation
      ? {
          query: {
            ...existingAttrs.evaluation.query,
            ...updateData.evaluation.query,
          },
        }
      : existingAttrs.evaluation,
    // `null` → clear (undefined). SO schema uses `maybe()` without `nullable()`.
    recovery_policy: nullToUndefined(updateData.recovery_policy, existingAttrs.recovery_policy),
    // `null` → clear (null). SO schema uses `maybe(nullable())`.
    state_transition: applyNullableUpdate(
      updateData.state_transition,
      existingAttrs.state_transition
    ),
    // `null` → clear (undefined). SO schema uses `maybe()` without `nullable()`.
    grouping: nullToUndefined(updateData.grouping, existingAttrs.grouping),
    no_data: nullToUndefined(updateData.no_data, existingAttrs.no_data),
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
 * Converts saved object attributes into the public API response shape.
 */
export function transformRuleSoAttributesToRuleApiResponse(
  id: string,
  attrs: RuleSavedObjectAttributes
): RuleResponse {
  return {
    id,
    kind: attrs.kind,
    metadata: {
      name: attrs.metadata.name,
      description: attrs.metadata.description,
      owner: attrs.metadata.owner,
      tags: attrs.metadata.tags,
    },
    time_field: attrs.time_field,
    schedule: {
      every: attrs.schedule.every,
      lookback: attrs.schedule.lookback,
    },
    evaluation: {
      query: {
        base: attrs.evaluation.query.base,
      },
    },
    recovery_policy: attrs.recovery_policy,
    state_transition: attrs.state_transition,
    grouping: attrs.grouping,
    no_data: attrs.no_data,
    artifacts: attrs.artifacts,
    enabled: attrs.enabled,
    createdBy: attrs.createdBy,
    createdAt: attrs.createdAt,
    updatedBy: attrs.updatedBy,
    updatedAt: attrs.updatedAt,
  };
}
