/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  isAbsenceDistinguishableFromBreach,
  isRecoveryConditionUsableWithBreach,
  REQUIRE_DISTINGUISHABLE_ABSENCE_MESSAGE,
  type NoData,
  type Query,
  type Recovery,
  type RuleKind,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';

/**
 * Minimal rule context needed to validate a generated query against the rule's
 * lifecycle configuration. Structurally compatible with both
 * ResolvedCreateRuleData (write-time path) and a RuleResponse subset
 * (execution-time compile path).
 */
export interface RuleQueryValidationContext {
  kind: RuleKind;
  query: Query;
  recovery?: Recovery | null;
  no_data?: NoData | null;
}

type InvariantCheck = (data: RuleQueryValidationContext) => boolean;

/**
 * Invariants a generated query must satisfy relative to the rule's lifecycle
 * objects. These are exactly the wire schema's query-reading refinements, which
 * a builder-authored rule escapes at write time because it carries no query
 * then. Each function is cast to accept a RuleQueryValidationContext, which is
 * structurally compatible with each function's narrower parameter type.
 * Ordered: first violation wins.
 */
export const GENERATED_QUERY_INVARIANTS: ReadonlyArray<{
  readonly holds: InvariantCheck;
  readonly message: string;
}> = [
  {
    holds: isRecoveryConditionUsableWithBreach as InvariantCheck,
    message: 'recovery.strategy "condition" requires query.breach.',
  },
  {
    holds: isAbsenceDistinguishableFromBreach as InvariantCheck,
    message: REQUIRE_DISTINGUISHABLE_ABSENCE_MESSAGE,
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
