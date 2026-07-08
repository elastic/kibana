/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLControlVariable } from '@kbn/esql-types';
import { inlineEsqlVariables } from '../../../utils/esql_rule_utils';
import { RULE_BUILDER_REGISTRY } from './registry';
import { parseDiscoverQueryForBuilder } from './threshold/parse_esql';
import type { BuilderState } from './types';

export interface ResolvedBuilderState {
  builderState: BuilderState;
  /**
   * True when builderState was derived by successfully parsing a Discover-seeded query —
   * false when it came from a caller-provided value or a fresh default. Callers that also
   * seed the underlying RHF form from the same Discover query need this fact: a raw ES|QL
   * string shouldn't be pushed into the form when the builder couldn't represent it.
   */
  parsedFromDiscover: boolean;
}

export interface ResolveInitialBuilderStateParams {
  /** An already-known builder state (e.g. parsed from a persisted rule being edited). */
  initialBuilderState?: BuilderState;
  /** A Discover-seeded ES|QL query to attempt parsing into builder state, when initialBuilderState isn't provided. */
  initialQuery?: string;
  esqlVariables?: ESQLControlVariable[];
}

/**
 * Resolves what a builder's state should start as, given everything a caller might supply.
 * Mirrors resolveSteps' role for step sequencing: the caller (not ComposeDiscoverFlyout)
 * decides this once, up front, so the flyout never needs its own "am I in builder mode"
 * initial-state logic.
 */
export const resolveInitialBuilderState = (
  builderType: string | undefined,
  { initialBuilderState, initialQuery, esqlVariables }: ResolveInitialBuilderStateParams
): ResolvedBuilderState => {
  if (!builderType) {
    return { builderState: undefined, parsedFromDiscover: false };
  }
  if (initialBuilderState !== undefined) {
    return { builderState: initialBuilderState, parsedFromDiscover: false };
  }
  const inlinedQuery =
    initialQuery !== undefined ? inlineEsqlVariables(initialQuery, esqlVariables).query : '';
  const parsed = inlinedQuery ? parseDiscoverQueryForBuilder(inlinedQuery) : null;
  if (parsed) {
    return { builderState: parsed, parsedFromDiscover: true };
  }
  const definition = RULE_BUILDER_REGISTRY[builderType];
  return { builderState: definition?.createDefaultState(), parsedFromDiscover: false };
};
