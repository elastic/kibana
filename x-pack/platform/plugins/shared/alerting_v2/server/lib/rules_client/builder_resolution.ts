/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isEqual } from 'lodash';
import {
  getBreachEsqlQuery,
  isNoDataQueryProvidedForStrategy,
  isRecoveryQueryConsistentWithStrategy,
  isRecoveryQueryProvidedForStrategy,
  isSignalUsingStandaloneFormat,
  type CreateRuleData,
  type Query,
  type RuleKind,
  type UpdateRuleData,
} from '@kbn/alerting-v2-schemas';
import type { RuleSavedObjectAttributes } from '../../saved_objects';
import type { BuilderTypeRegistry, GeneratedQuery, OpaqueBuilderFields } from '../builder_types';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import type { ResolvedCreateRuleData, ResolvedUpdateRuleData } from './types';
import { toStoredQuery } from './utils';

/**
 * Adapts a generated query to the rule's kind, so a builder describes its
 * detection once instead of once per kind.
 *
 * Signal rules run only a breach query and are accepted in the standalone
 * format alone, so a composed query is flattened onto its breach segment. A
 * recovery segment cannot survive that flattening, and a signal rule cannot
 * recover anyway, so a builder that emits one for a signal rule is refused
 * rather than having part of its output dropped.
 */
const adaptToKind = (
  generated: GeneratedQuery,
  kind: RuleKind,
  builderType: string
): GeneratedQuery => {
  if (kind !== 'signal' || generated.query.format === 'standalone') {
    return generated;
  }

  if (generated.query.recovery) {
    throw Boom.badRequest(
      `The "${builderType}" rule builder generated a recovery query, which a signal rule cannot run.`,
      {
        code: ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED,
        details: { builder_type: builderType },
      }
    );
  }

  return {
    ...generated,
    query: {
      format: 'standalone',
      breach: { query: getBreachEsqlQuery(generated.query) },
    },
  };
};

/**
 * The create schema's query invariants that hold no information until the
 * builder has generated the query. On update the merged attributes are validated
 * against the same predicates, so this only covers create.
 */
const GENERATED_QUERY_INVARIANTS = [
  {
    holds: isSignalUsingStandaloneFormat,
    message: 'kind "signal" requires query.format "standalone".',
  },
  {
    holds: isRecoveryQueryConsistentWithStrategy,
    message: 'query.recovery is only allowed when recovery_strategy is "query".',
  },
  {
    holds: isRecoveryQueryProvidedForStrategy,
    message: 'query.recovery is required when recovery_strategy is "query".',
  },
  {
    holds: isNoDataQueryProvidedForStrategy,
    message:
      'query.no_data is required when no_data_strategy is not "none" for standalone-format rules.',
  },
] as const;

/**
 * Holds a generated query to the invariants the caller's query would have had to
 * satisfy. A violation is the builder's doing rather than the caller's, so it
 * reads as a generation failure and names the builder.
 */
const assertGeneratedQueryIsValid = (
  resolved: ResolvedCreateRuleData,
  builderType: string
): void => {
  for (const { holds, message } of GENERATED_QUERY_INVARIANTS) {
    if (!holds(resolved)) {
      throw Boom.badRequest(
        `The "${builderType}" rule builder generated a query that is not valid for this rule: ${message}`,
        {
          code: ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED,
          details: { builder_type: builderType },
        }
      );
    }
  }
};

/**
 * Applies a builder's generated output over the caller's data. `time_field` and
 * `grouping` are overridden when the builder returns them, because they are
 * derived from the same fields as the query and would otherwise be free to
 * drift away from it.
 */
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
    const resolved = withGenerated(
      data,
      adaptToKind(registry.generate(builderType, builderFields), data.kind, builderType)
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

/**
 * Settles the builder metadata and query for a PATCH update against the stored
 * rule.
 *
 * A builder owns its rule's query, so the ways to affect it are to send new
 * `builder_fields` — which regenerates it — or to opt the rule out of the
 * builder with `builder_type: null`, which releases the query for direct edits
 * in the same request. Writing `query` directly is refused rather than silently
 * leaving the rule's stored parameters describing a query it no longer has.
 *
 * Regeneration only happens when builder fields are actually written, so a rule
 * whose builder plugin has since been disabled can still be renamed, retagged,
 * rescheduled, enabled or disabled.
 *
 * @throws `Boom` 400 for a query write on a builder rule, builder fields with no
 * builder type to validate them, a builder type change that leaves the stored
 * fields orphaned, an unregistered builder type, or invalid fields.
 */
export function resolveUpdateRuleBuilder(
  registry: BuilderTypeRegistry,
  ruleId: string,
  data: UpdateRuleData,
  existing: RuleSavedObjectAttributes
): ResolvedUpdateRuleData {
  const requestedType = data.metadata?.builder_type;
  const requestedFields = data.metadata?.builder_fields;
  const existingType = existing.metadata.builder_type;

  // Opting out: drop the builder association and its parameters together, and
  // let a `query` in the same request through.
  if (requestedType === null) {
    return {
      ...data,
      metadata: { ...data.metadata, builder_type: null, builder_fields: null },
    };
  }

  const effectiveType = requestedType ?? existingType;

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

    const generated = adaptToKind(
      registry.generate(effectiveType, requestedFields as OpaqueBuilderFields),
      existing.kind,
      effectiveType
    );
    return withGenerated(
      { ...data, metadata: { ...data.metadata, builder_type: effectiveType } },
      generated
    );
  }

  // Compare in stored shape so an unchanged conditionless query (`breach`
  // omitted in the body, empty segment on disk) does not read as a change.
  const queryChanged =
    data.query !== undefined && !isEqual(toStoredQuery(data.query), existing.query);

  if (queryChanged && effectiveType) {
    throw Boom.badRequest(
      `Rule "${ruleId}" is authored by the "${effectiveType}" rule builder, so its query cannot be changed directly. Send metadata.builder_fields to regenerate it, or metadata.builder_type: null in the same request to confirm the transition to ES|QL mode.`,
      {
        code: ALERTING_ERROR_CODES.BUILDER_TYPE_NOT_CLEARED,
        details: { rule_id: ruleId, builder_type: effectiveType },
      }
    );
  }

  // Switching builder type without new fields would leave the stored fields
  // validated against the previous builder's schema, and the query generated by
  // it, so the rule would no longer describe itself.
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

  // Adopting a builder for a rule that had none also needs its fields, since
  // there is nothing stored to generate a query from.
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
