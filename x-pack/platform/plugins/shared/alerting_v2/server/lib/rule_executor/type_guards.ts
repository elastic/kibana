/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulePipelineState } from './types';

export type StateWithRule = RulePipelineState & {
  rule: NonNullable<RulePipelineState['rule']>;
};

export type StateWithEsqlResponse = RulePipelineState & {
  esqlResponse: NonNullable<RulePipelineState['esqlResponse']>;
};

export function hasRule(state: RulePipelineState): state is StateWithRule {
  return state.rule !== undefined;
}

export function hasEsqlResponse(state: RulePipelineState): state is StateWithEsqlResponse {
  return state.esqlResponse !== undefined;
}

export function hasRuleAndEsqlResponse(
  state: RulePipelineState
): state is StateWithRule & StateWithEsqlResponse {
  return hasRule(state) && hasEsqlResponse(state);
}
