/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isEqual } from 'lodash';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { treeifyError } from '@kbn/zod/v4';
import {
  type CreateRuleData,
  type ReplaceRuleData,
  type Query,
  type UpdateRuleData,
} from '@kbn/alerting-v2-schemas';
import type { RuleSavedObjectAttributes } from '../../saved_objects';
import type {
  BuilderTypeRegistry,
  DerivedRuleFields,
  GeneratedQuery,
  OpaqueBuilderFields,
  RegisteredBuilderType,
} from '../builder_types';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import type { ResolvedCreateRuleData, ResolvedUpdateRuleData } from './types';
import { toStoredQuery } from './utils';
import {
  adaptToKind,
  assertGeneratedQueryIsValid,
} from '../builder_types/generated_query_validation';

/** Options shared by all resolution functions. */
export interface BuilderResolutionOptions {
  /**
   * When false, skip the builder schema parse (and the derived-fields
   * projection for execution-time types). Default: true.
   *
   * The opt-out exists for migration tooling that manages its own consistency.
   * The framework's own HTTP routes and the Detections API never pass it.
   *
   * Ref: rule-validation.md "Write-path validation: on by default, opt-out per call"
   */
  validateBuilderFields?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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
 * Applies derived rule fields with the same override semantics as
 * `withGenerated`: an `undefined` member keeps the caller-sent or stored value.
 * Unlike `withGenerated`, no `query` is set — execution-time rules persist none.
 *
 * Ref: rule-execution-logic.md "Derived rule fields at write time"
 */
const withDerived = <T extends { time_field?: string; grouping?: unknown }>(
  data: T,
  derived: DerivedRuleFields
): T => ({
  ...data,
  ...(derived.time_field === undefined ? {} : { time_field: derived.time_field }),
  ...(derived.grouping === undefined ? {} : { grouping: derived.grouping }),
});

/**
 * Parses `builderFields` against the type's schema and throws a well-formed
 * Boom 400 on failure. Returns the parsed value on success.
 */
function parseBuilderFields(
  definition: RegisteredBuilderType,
  builderFields: OpaqueBuilderFields
): OpaqueBuilderFields {
  let result;
  try {
    result = definition.builderFieldsSchema.safeParse(builderFields);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw Boom.badRequest(
      `builder_fields for builder type "${definition.type}" failed validation: ${message}`,
      {
        code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS,
        details: { builder_type: definition.type },
      }
    );
  }

  if (!result.success) {
    throw Boom.badRequest(
      `builder_fields for builder type "${definition.type}" are invalid: ${stringifyZodError(
        result.error
      )}`,
      {
        code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS,
        details: { builder_type: definition.type, errors: treeifyError(result.error) },
      }
    );
  }

  // Run the extra validation hook after the schema parse succeeds.
  // Its errors reject the write exactly like schema errors.
  // Ref: rule-validation.md "The extra validation hook"
  if (definition.validateFields) {
    const hookErrors = definition.validateFields(result.data);
    if (hookErrors.length > 0) {
      throw Boom.badRequest(
        `builder_fields for builder type "${definition.type}" are invalid: ${hookErrors.join(
          '; '
        )}`,
        {
          code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS,
          details: { builder_type: definition.type },
        }
      );
    }
  }

  return result.data;
}

/**
 * Handles the execution-time create path: derive framework fields from the
 * parsed builder fields; persist no `query`.
 *
 * When `validateBuilderFields` is false and the fields do not parse, the
 * derivation is skipped and the caller-sent values stand. That inconsistency
 * cannot reach detection — such a rule fails every run at the compile step.
 *
 * Ref: rule-execution-logic.md "Derived rule fields at write time"
 */
function resolveExecutionTimeCreate(
  definition: RegisteredBuilderType,
  data: CreateRuleData,
  validateBuilderFields: boolean
): ResolvedCreateRuleData {
  const builderFields = data.metadata.builder_fields as OpaqueBuilderFields;

  if (!validateBuilderFields) {
    // Opt-out: attempt parse, skip derivation on failure.
    const result = definition.builderFieldsSchema.safeParse(builderFields);
    if (!result.success) {
      // Fields do not parse under opt-out — skip derivation, return as-is.
      return data;
    }
    if (definition.deriveRuleFields) {
      return withDerived(data, definition.deriveRuleFields(result.data));
    }
    return data;
  }

  // Validation on (default): parse throws on failure.
  const parsed = parseBuilderFields(definition, builderFields);
  if (definition.deriveRuleFields) {
    return withDerived(data, definition.deriveRuleFields(parsed));
  }
  return data;
}

/**
 * Handles the execution-time update path: derive framework fields from the
 * parsed builder fields; persist no `query`.
 *
 * Sets `query: null` to signal `buildUpdateRuleAttributes` to clear any stale
 * stored query. This handles the case where a PATCH switches a rule from a
 * write-time builder type (which compiled and stored a query) to an
 * execution-time type. Without an explicit clear, the old query would be
 * preserved by `buildUpdateRuleAttributes`'s "omitted = preserve" semantics.
 *
 * Ref: rule-execution-logic.md "A rule without a persisted query"
 *   ("no saved-object attribute, no cached last-compiled copy")
 */
function resolveExecutionTimeUpdate(
  definition: RegisteredBuilderType,
  data: UpdateRuleData,
  effectiveType: string,
  builderFields: OpaqueBuilderFields,
  validateBuilderFields: boolean
): ResolvedUpdateRuleData {
  const base: ResolvedUpdateRuleData = {
    ...data,
    // null signals buildUpdateRuleAttributes to clear any stale stored query,
    // including one left over from a previous write-time builder type.
    query: null,
    metadata: { ...data.metadata, builder_type: effectiveType },
  };

  if (!validateBuilderFields) {
    const result = definition.builderFieldsSchema.safeParse(builderFields);
    if (!result.success) {
      return base;
    }
    if (definition.deriveRuleFields) {
      return withDerived(base, definition.deriveRuleFields(result.data));
    }
    return base;
  }

  const parsed = parseBuilderFields(definition, builderFields);
  if (definition.deriveRuleFields) {
    return withDerived(base, definition.deriveRuleFields(parsed));
  }
  return base;
}

// ---------------------------------------------------------------------------
// Public resolution functions
// ---------------------------------------------------------------------------

/**
 * Settles the query for a create (or PUT upsert): generated from
 * `metadata.builder_fields` when the rule carries them, otherwise taken as sent.
 *
 * For write-time types the query is generated and persisted. For
 * execution-time types the query is not generated at write; only derived
 * framework fields (grouping, time_field) are computed and persisted.
 *
 * @throws `Boom` 400 when the builder type is unregistered or its fields are
 * invalid.
 */
export function resolveCreateRuleBuilder(
  registry: BuilderTypeRegistry,
  data: CreateRuleData,
  options?: BuilderResolutionOptions
): ResolvedCreateRuleData {
  const { builder_type: builderType, builder_fields: builderFields } = data.metadata;
  const validateBuilderFields = options?.validateBuilderFields ?? true;

  if (builderType && builderFields) {
    const definition = registry.get(builderType);

    // Execution-time types: derive fields, persist no query.
    if (definition?.compilation === 'execution_time') {
      return resolveExecutionTimeCreate(definition, data, validateBuilderFields);
    }

    // Write-time types (default): compile and persist the query.
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
  existing: RuleSavedObjectAttributes,
  options?: BuilderResolutionOptions
): ResolvedUpdateRuleData {
  const requestedType = data.metadata?.builder_type;
  const requestedFields = data.metadata?.builder_fields;
  const existingType = existing.metadata.builder_type;
  const validateBuilderFields = options?.validateBuilderFields ?? true;

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

    const definition = registry.get(effectiveType);

    // Execution-time types: derive fields, persist no query.
    if (definition?.compilation === 'execution_time') {
      return resolveExecutionTimeUpdate(
        definition,
        data,
        effectiveType,
        requestedFields as OpaqueBuilderFields,
        validateBuilderFields
      );
    }

    // Write-time types (default): compile and persist the query.
    //
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

    const resolvedData = withGenerated(
      {
        ...data,
        metadata: { ...data.metadata, builder_type: effectiveType },
        ...(effectiveStrategy !== data.recovery_strategy
          ? { recovery_strategy: effectiveStrategy }
          : {}),
      },
      effectiveGenerated
    );

    // Fix: assertGeneratedQueryIsValid also runs on the update path.
    // Previously this check was missing from updates, allowing a builder to
    // generate a query that violates invariants (e.g. recovery_strategy: 'query'
    // but no recovery block generated) without being rejected.
    //
    // `kind` comes from the stored rule — updates cannot change it — so it is
    // always present and guarantees RuleQueryValidationContext.kind is satisfied.
    //
    // Ref: rule-execution-logic.md "What this design needs from the framework"
    assertGeneratedQueryIsValid({ ...resolvedData, kind: existing.kind }, effectiveType);

    return resolvedData;
  }

  const storedQuery = existing.query !== undefined ? toStoredQuery(existing.query) : undefined;
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
  existing: RuleSavedObjectAttributes,
  options?: BuilderResolutionOptions
): ResolvedCreateRuleData {
  const existingType = existing.metadata.builder_type;

  // No stored builder type: the replace is a straightforward create-shaped
  // resolution. Delegate to the create path unchanged.
  if (!existingType) {
    // Cast: data.metadata.builder_type is `string | null | undefined` on
    // ReplaceRuleData. When there is no stored builder_type we know the null
    // escape hatch is irrelevant; create resolution treats null as absent.
    return resolveCreateRuleBuilder(registry, data as unknown as CreateRuleData, options);
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
    return resolveCreateRuleBuilder(registry, data as unknown as CreateRuleData, options);
  }

  if (data.metadata?.builder_type === null) {
    // Path 2: explicit clear. Normalise null → undefined so the create path
    // treats this as a plain rule, and null is never written to storage.
    const cleared: CreateRuleData = {
      ...(data as unknown as CreateRuleData),
      metadata: { ...data.metadata, builder_type: undefined, builder_fields: undefined },
    };
    return resolveCreateRuleBuilder(registry, cleared, options);
  }

  // Path 3 / 4: no builder_fields, no explicit null.
  //
  // Check whether this is a faithful round-trip (Path 3) or a destructive
  // change (Path 4). The round-trip is accepted only when:
  //   - the body carries the same builder_type as stored (not omitted),
  //   - the stored rule has no builder_fields to drop, and
  //   - the query is identical to the stored query.
  const storedBuilderFields = existing.metadata.builder_fields;
  const storedQuery = existing.query !== undefined ? toStoredQuery(existing.query) : undefined;
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
