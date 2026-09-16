/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  getBreachEsqlQuery,
  isNoDataQueryProvidedForStrategy,
  isRecoveryQueryConsistentWithStrategy,
  isRecoveryQueryProvidedForStrategy,
  isSignalUsingStandaloneFormat,
  type Query,
  type RuleKind,
} from '@kbn/alerting-v2-schemas';
import type { GeneratedQuery } from './types';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';

/**
 * Minimal rule context needed to validate a generated query against the rule's
 * kind and strategies. Structurally compatible with both ResolvedCreateRuleData
 * (write-time path) and a RuleResponse subset (execution-time compile path).
 */
export interface RuleQueryValidationContext {
  kind: RuleKind;
  query: Query;
  recovery_strategy?: string | null;
  no_data_strategy?: string | null;
}

type InvariantCheck = (data: RuleQueryValidationContext) => boolean;

/**
 * Converts a composed GeneratedQuery to standalone form for signal rules, and
 * rejects a recovery block on a signal rule. No-op for non-signal rules.
 *
 * Shared between the write-time builder resolution (builder_resolution.ts) and
 * the execution-time compile step (compile_rule_query_step.ts).
 *
 * @throws Boom 400 (BUILDER_QUERY_GENERATION_FAILED) when the query carries a
 *   recovery block that a signal rule cannot run.
 */
export const adaptToKind = (
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
 * Invariants a generated query must satisfy relative to the rule's kind and
 * strategies. Each function is cast to accept a RuleQueryValidationContext,
 * which is structurally compatible with each function's narrower parameter type.
 * Ordered: first violation wins.
 */
export const GENERATED_QUERY_INVARIANTS: ReadonlyArray<{
  readonly holds: InvariantCheck;
  readonly message: string;
}> = [
  {
    holds: isSignalUsingStandaloneFormat as InvariantCheck,
    message: 'kind "signal" requires query.format "standalone".',
  },
  {
    holds: isRecoveryQueryConsistentWithStrategy as InvariantCheck,
    message: 'query.recovery is only allowed when recovery_strategy is "query".',
  },
  {
    holds: isRecoveryQueryProvidedForStrategy as InvariantCheck,
    message: 'query.recovery is required when recovery_strategy is "query".',
  },
  {
    holds: isNoDataQueryProvidedForStrategy as InvariantCheck,
    message:
      'query.no_data is required when no_data_strategy is not "none" for standalone-format rules.',
  },
];

/**
 * Asserts every invariant in {@link GENERATED_QUERY_INVARIANTS} holds for the
 * given rule-with-query context.
 *
 * @throws Boom 400 (BUILDER_QUERY_GENERATION_FAILED) on the first violated
 *   invariant.
 */
export const assertGeneratedQueryIsValid = (
  ruleWithQuery: RuleQueryValidationContext,
  builderType: string
): void => {
  for (const { holds, message } of GENERATED_QUERY_INVARIANTS) {
    if (!holds(ruleWithQuery)) {
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
