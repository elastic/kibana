/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeSolution } from '@kbn/alerting-types';
import type { InternalRuleType } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';
import { SUPPORTED_SOLUTIONS } from '../constants';

/**
 * Filters rule types by solution and returns their ids.
 * Stack rules are included under Observability.
 */
export const getRuleTypeIdsForSolution = (
  ruleTypes: InternalRuleType[],
  solution: RuleTypeSolution
) => {
  return ruleTypes
    .filter(
      (ruleType) =>
        ruleType.solution === solution ||
        (solution === 'observability' && ruleType.solution === 'stack')
    )
    .map((ruleType) => ruleType.id);
};

/**
 * Computes the available solutions based on the rule types,
 * grouping stack under observability
 */
export const getAvailableSolutions = (ruleTypes: InternalRuleType[]) => {
  const solutions = new Set<RuleTypeSolution>();

  for (const ruleType of ruleTypes) {
    // We want to filter out solutions we do not support in case someone
    // abuses the solution rule type attribute
    if (SUPPORTED_SOLUTIONS.includes(ruleType.solution)) {
      solutions.add(ruleType.solution);
    }
  }

  if (solutions.has('stack') && solutions.has('observability')) {
    solutions.delete('stack');
  }

  return Array.from(solutions);
};
