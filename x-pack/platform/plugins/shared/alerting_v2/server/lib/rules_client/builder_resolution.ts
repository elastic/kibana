/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isEqual } from 'lodash';
import {
  type CreateRuleData,
  type ReplaceRuleData,
  type Query,
  type UpdateRuleData,
} from '@kbn/alerting-v2-schemas';
import type { RuleSavedObjectAttributes } from '../../saved_objects';
import type { BuilderTypeRegistry, GeneratedQuery, OpaqueBuilderFields } from '../builder_types';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import type { ResolvedCreateRuleData, ResolvedUpdateRuleData } from './types';
import { toStoredQuery } from './utils';
import {
  adaptToKind,
  assertGeneratedQueryIsValid,
} from '../builder_types/generated_query_validation';

const withGenerated = <T extends { query?: Query; time_field?: string; grouping?: unknown }>(
  data: T,
  generated: GeneratedQuery
): T & { query: Query } => ({
  ...data,
  query: generated.query,
  ...(generated.time_field === undefined ? {} : { time_field: generated.time_field }),
  ...(generated.grouping === undefined ? {} : { grouping: generated.grouping }),
});

/**
 * Settles the query for a create (or PUT upsert): generated from
 * `metadata.builder_fields` when the rule carries them, otherwise taken as sent.
 *
 * @throws `Boom` 400 when the builder type is unregistered or its fields are
 * invalid.
 */
export function resolveCreateRuleBuilder(
  registry: BuilderTypeRegistry,
  data: CreateRuleData
): ResolvedCreateRuleData {
  const { builder_type: builderType, builder_fields: builderFields } = data.metadata;

  if (builderType && builderFields) {
    const generated = adaptToKind(
      registry.generate(builderType, builderFields, {
        kind: data.kind,
        schedule: data.schedule,
        time_field: data.time_field,
      }),
      data.kind,
      builderType
    );

    const hasGeneratedRecovery =
      generated.query.format === 'composed' && generated.query.recovery != null;
    let effectiveGenerated = generated;
    let effectiveStrategy = data.recovery_strategy;

    if (hasGeneratedRecovery) {
      if (effectiveStrategy === undefined) {
        effectiveStrategy = 'query';
      } else if (effectiveStrategy !== 'query') {
        effectiveGenerated = {
          ...generated,
          query: { ...generated.query, recovery: undefined },
        };
      }
    }

    const resolved = withGenerated(
      {
        ...data,
        ...(effectiveStrategy !== data.recovery_strategy
          ? { recovery_strategy: effectiveStrategy }
          : {}),
      },
      effectiveGenerated
    );
    assertGeneratedQueryIsValid(resolved, builderType);
    return resolved;
  }

  if (!data.query) {
    // Unreachable through the API: `createRuleDataSchema` requires a query
    // unless a builder supplies one. Guarded so a future schema change cannot
    // silently persist a rule with no query.
    throw Boom.badRequest('query is required unless metadata.builder_fields is set.', {
      code: ALERTING_ERROR_CODES.INVALID_RULE_DATA,
      details: {},
    });
  }

  return { ...data, query: data.query };
}

export function resolveUpdateRuleBuilder(
  registry: BuilderTypeRegistry,
  ruleId: string,
  data: UpdateRuleData,
  existing: RuleSavedObjectAttributes
): ResolvedUpdateRuleData {
  const requestedType = data.metadata?.builder_type;
  const requestedFields = data.metadata?.builder_fields;
  const existingType = existing.metadata.builder_type;

  if (requestedType === null) {
    if (requestedFields != null) {
      throw Boom.badRequest(
        `Rule "${ruleId}" cannot set metadata.builder_fields while clearing metadata.builder_type.`,
        {
          code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS,
          details: { rule_id: ruleId },
        }
      );
    }

    return {
      ...data,
      metadata: { ...data.metadata, builder_type: null, builder_fields: null },
    };
  }

  const effectiveType = requestedType ?? existingType;

  if (requestedFields === null && effectiveType) {
    throw Boom.badRequest(
      `Rule "${ruleId}" cannot clear metadata.builder_fields without also clearing metadata.builder_type (send metadata.builder_type: null).`,
      {
        code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS,
        details: { rule_id: ruleId, builder_type: effectiveType },
      }
    );
  }

  if (requestedFields != null) {
    if (!effectiveType) {
      throw Boom.badRequest(
        `Rule "${ruleId}" has no rule builder, so metadata.builder_fields cannot be set without metadata.builder_type.`,
        {
          code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS,
          details: { rule_id: ruleId },
        }
      );
    }

    // Use the post-write (effective) values of schedule and time_field so that
    // a query compiled here agrees with what `buildUpdateRuleAttributes` will
    // persist. The persisted schedule is `{ ...existing.schedule, ...data.schedule }`,
    // and the persisted time_field is `data.time_field ?? existing.time_field`.
    // Passing pre-update values would produce a query compiled against a
    // schedule or time_field that the stored rule no longer reflects.
    //
    // Ref: rule-execution-logic.md "The compilation contract" —
    //   "Read-only framework fields of the rule being compiled"
    const effectiveSchedule = { ...existing.schedule, ...data.schedule };
    const effectiveTimeField = data.time_field ?? existing.time_field;

    const generated = adaptToKind(
      registry.generate(effectiveType, requestedFields as OpaqueBuilderFields, {
        id: ruleId,
        kind: existing.kind,
        schedule: effectiveSchedule,
        time_field: effectiveTimeField,
      }),
      existing.kind,
      effectiveType
    );

    const hasGeneratedRecovery =
      generated.query.format === 'composed' && generated.query.recovery != null;
    let effectiveGenerated = generated;
    let effectiveStrategy = data.recovery_strategy ?? existing.recovery_strategy;

    if (hasGeneratedRecovery) {
      if (effectiveStrategy === undefined || effectiveStrategy === null) {
        effectiveStrategy = 'query';
      } else if (effectiveStrategy !== 'query') {
        effectiveGenerated = {
          ...generated,
          query: { ...generated.query, recovery: undefined },
        };
      }
    }

    return withGenerated(
      {
        ...data,
        metadata: { ...data.metadata, builder_type: effectiveType },
        ...(effectiveStrategy !== data.recovery_strategy
          ? { recovery_strategy: effectiveStrategy }
          : {}),
      },
      effectiveGenerated
    );
  }

  const storedQuery = toStoredQuery(existing.query);
  const queryChanged = data.query !== undefined && !isEqual(toStoredQuery(data.query), storedQuery);

  if (queryChanged && effectiveType) {
    throw Boom.badRequest(
      `Rule "${ruleId}" is authored by the "${effectiveType}" rule builder, so its query cannot be changed directly. Send metadata.builder_fields to regenerate it, or metadata.builder_type: null in the same request to confirm the transition to ES|QL mode.`,
      {
        code: ALERTING_ERROR_CODES.BUILDER_TYPE_NOT_CLEARED,
        details: { rule_id: ruleId, builder_type: effectiveType },
      }
    );
  }

  if (requestedType && existingType && requestedType !== existingType) {
    throw Boom.badRequest(
      `Rule "${ruleId}" cannot change its rule builder from "${existingType}" to "${requestedType}" without metadata.builder_fields for the new builder.`,
      {
        code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS,
        details: {
          rule_id: ruleId,
          builder_type: requestedType,
          previous_builder_type: existingType,
        },
      }
    );
  }

  if (requestedType && !existingType) {
    throw Boom.badRequest(
      `Rule "${ruleId}" cannot adopt the "${requestedType}" rule builder without metadata.builder_fields to generate its query from.`,
      {
        code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS,
        details: { rule_id: ruleId, builder_type: requestedType },
      }
    );
  }

  return data;
}

/**
 * Settles the query for a PUT (upsert replace): closes the builder-query
 * protection hole that `resolveCreateRuleBuilder` cannot close on its own.
 *
 * When the stored rule carries a `builder_type`, a plain PUT body must either
 * supply `metadata.builder_fields` (to regenerate the query through the
 * builder) or send `metadata.builder_type: null` (the explicit escape hatch
 * that confirms the transition to ES|QL mode). Any other plain-query body
 * would silently strip the builder relationship, so it is rejected with
 * `BUILDER_TYPE_NOT_CLEARED`.
 *
 * The `metadata.builder_type: null` signal is normalised to `undefined` before
 * the call reaches `resolveCreateRuleBuilder`, so null never propagates to
 * storage.
 *
 * For rules that have no stored `builder_type`, the function delegates
 * directly to `resolveCreateRuleBuilder` — identical to the old behaviour.
 *
 * Ref: rule-types.md "What this design needs from the framework"
 *
 * @throws `Boom` 400 with `BUILDER_TYPE_NOT_CLEARED` when the PUT body would
 * silently strip an existing builder relationship.
 */
export function resolveReplaceRuleBuilder(
  registry: BuilderTypeRegistry,
  ruleId: string,
  data: ReplaceRuleData,
  existing: RuleSavedObjectAttributes
): ResolvedCreateRuleData {
  const existingType = existing.metadata.builder_type;

  // No stored builder type: the replace is a straightforward create-shaped
  // resolution. Delegate to the create path unchanged.
  if (!existingType) {
    // Cast: data.metadata.builder_type is `string | null | undefined` on
    // ReplaceRuleData. When there is no stored builder_type we know the null
    // escape hatch is irrelevant; create resolution treats null as absent.
    return resolveCreateRuleBuilder(registry, data as unknown as CreateRuleData);
  }

  // The stored rule is builder-managed. Four valid paths:
  //
  //   1. The PUT body sends `builder_fields` — regenerate the query through
  //      the builder. The existing builder type is still the effective type;
  //      the create path handles generation.
  //
  //   2. The PUT body sends `metadata.builder_type: null` — explicit
  //      transition to ES|QL mode. Strip the builder context before delegating
  //      so null never reaches storage.
  //
  //   3. The PUT body carries the same `builder_type` as stored, the stored
  //      rule has no `builder_fields` (nothing to drop), and the query is
  //      unchanged — faithful round-trip that only changes non-query metadata.
  //      Mirrors PATCH's `queryChanged && effectiveType` check.
  //
  //   4. Anything else — the PUT body omits or changes `builder_type`, drops
  //      stored `builder_fields`, or changes the query without any of the
  //      above signals. This would silently corrupt the builder relationship;
  //      reject.
  //
  // Ref: rule-types.md "What this design needs from the framework"

  if (data.metadata?.builder_fields) {
    // Path 1: builder_fields provided → delegate to create-shaped resolution.
    // The schema already rejected null builder_type together with builder_fields,
    // so the cast is safe.
    return resolveCreateRuleBuilder(registry, data as unknown as CreateRuleData);
  }

  if (data.metadata?.builder_type === null) {
    // Path 2: explicit clear. Normalise null → undefined so the create path
    // treats this as a plain rule, and null is never written to storage.
    const cleared: CreateRuleData = {
      ...(data as unknown as CreateRuleData),
      metadata: { ...data.metadata, builder_type: undefined, builder_fields: undefined },
    };
    return resolveCreateRuleBuilder(registry, cleared);
  }

  // Path 3 / 4: no builder_fields, no explicit null.
  //
  // Check whether this is a faithful round-trip (Path 3) or a destructive
  // change (Path 4). The round-trip is accepted only when:
  //   - the body carries the same builder_type as stored (not omitted),
  //   - the stored rule has no builder_fields to drop, and
  //   - the query is identical to the stored query.
  const storedBuilderFields = existing.metadata.builder_fields;
  const storedQuery = toStoredQuery(existing.query);
  const bodyQuery = data.query;
  const queryChanged = !bodyQuery || !isEqual(toStoredQuery(bodyQuery), storedQuery);
  const typePreserved = data.metadata?.builder_type === existingType;

  if (typePreserved && !storedBuilderFields && !queryChanged) {
    // Path 3: faithful round-trip — pass through unchanged.
    return data as unknown as ResolvedCreateRuleData;
  }

  // Path 4: reject.
  throw Boom.badRequest(
    `Rule "${ruleId}" is authored by the "${existingType}" rule builder, so its query cannot be changed directly. Send metadata.builder_fields to regenerate it, or metadata.builder_type: null in the same request to confirm the transition to ES|QL mode.`,
    {
      code: ALERTING_ERROR_CODES.BUILDER_TYPE_NOT_CLEARED,
      details: { rule_id: ruleId, builder_type: existingType },
    }
  );
}
