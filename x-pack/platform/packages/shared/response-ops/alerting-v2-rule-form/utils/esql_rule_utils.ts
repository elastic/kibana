/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, Walker, Parser } from '@elastic/esql';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';

type ComposerParamValue = string | number | Array<string | number>;

export interface InlineEsqlVariablesResult {
  /** Query with all resolvable `?param` / `??param` tokens substituted. */
  query: string;
  /**
   * Tokens (with their `?` / `??` prefix) that remain in the output query
   * because no Control resolved them, the value was unsubstitutable, or
   * Composer rejected the substitution.
   */
  unresolved: string[];
}

/**
 * Composer's `inlineParam` supports: string / number / homogeneous non-empty
 * arrays of those (emitted as list literals, e.g. `("a", "b")`) / identifiers
 * via `??`. `time_literal` is excluded because Composer has no duration-aware
 * mode — a string value gets quoted and breaks the query.
 */
export const esqlControlVariableIsComposerInlinable = (v: ESQLControlVariable): boolean => {
  switch (v.type) {
    case ESQLVariableType.TIME_LITERAL:
      return false;
    case ESQLVariableType.MULTI_VALUES: {
      const { value } = v;
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        (typeof value[0] === 'string' || typeof value[0] === 'number') &&
        value.every((el) => typeof el === typeof value[0])
      );
    }
    case ESQLVariableType.VALUES:
      return typeof v.value === 'string' || typeof v.value === 'number';
    case ESQLVariableType.FIELDS:
    case ESQLVariableType.FUNCTIONS:
      return typeof v.value === 'string';
    default:
      return false;
  }
};

/**
 * Names the alerting v2 rule executor substitutes itself with the rule's time
 * window at execution time (see `get_query_payload.ts`). They are valid in a
 * persisted rule and must not be flagged as unresolved.
 *
 * Side-effect: a user-created control whose key collides with one of these
 * names will be silently ignored — the placeholder stays in the query for the
 * executor to bind at run time.
 */
const RESERVED_RULE_PARAM_NAMES: ReadonlySet<string> = new Set(['_tstart', '_tend']);

type PlaceholderShape = 'value' | 'identifier';

const naturalPlaceholderShape = (v: ESQLControlVariable): PlaceholderShape => {
  switch (v.type) {
    case ESQLVariableType.FIELDS:
    case ESQLVariableType.FUNCTIONS:
      return 'identifier';
    default:
      return 'value';
  }
};

/**
 * Returns unique `?param` / `??param` tokens (with prefix) still present in
 * `query`, excluding reserved rule-executor params. Uses the ANTLR-based parser
 * so tokens inside string literals are never false-positives.
 */
const findPlaceholderTokens = (query: string): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of Walker.params(Parser.parse(query).root)) {
    const name = p.value as string;
    if (RESERVED_RULE_PARAM_NAMES.has(name)) continue;
    const token = p.text as string;
    if (!seen.has(token)) {
      seen.add(token);
      result.push(token);
    }
  }
  return result;
};

/**
 * Builds a map of param name → set of shapes ('value' | 'identifier') seen in
 * `query`. Uses the ANTLR-based parser — immune to tokens inside string literals.
 */
const collectPlaceholderShapesByName = (query: string): Map<string, Set<PlaceholderShape>> => {
  const { root } = Parser.parse(query);
  const byName = new Map<string, Set<PlaceholderShape>>();
  for (const p of Walker.params(root)) {
    const name = p.value as string;
    const shape: PlaceholderShape = (p.text as string).startsWith('??') ? 'identifier' : 'value';
    let shapes = byName.get(name);
    if (!shapes) {
      shapes = new Set();
      byName.set(name, shapes);
    }
    shapes.add(shape);
  }
  return byName;
};

/**
 * Inline `?param` / `??param` Control bindings into an ES|QL query.
 */
export const inlineEsqlVariables = (
  query: string,
  esqlVariables: ESQLControlVariable[] | undefined
): InlineEsqlVariablesResult => {
  // undefined → caller doesn't use ES|QL controls at all; skip scanning so
  // queries with literal ?param tokens (e.g. ?_tstart) don't block save.
  // [] → caller uses controls but none are bound; scan for leftover tokens.
  if (esqlVariables === undefined) {
    return { query, unresolved: [] };
  }
  if (esqlVariables.length === 0) {
    return { query, unresolved: findPlaceholderTokens(query) };
  }

  // Composer — value/identifier inlining.
  // TIME_LITERAL is intentionally excluded: Composer has no duration-aware mode
  // and would quote the value (e.g. "15m"), producing a broken query. Those
  // placeholders stay unresolved and block save until proper support is added.
  const shapesByName = collectPlaceholderShapesByName(query);
  const params = esqlVariables.reduce<Record<string, ComposerParamValue>>((acc, v) => {
    if (!esqlControlVariableIsComposerInlinable(v) || RESERVED_RULE_PARAM_NAMES.has(v.key)) {
      return acc;
    }
    const seenShapes = shapesByName.get(v.key);
    if (!seenShapes || seenShapes.size !== 1) {
      return acc;
    }
    if (!seenShapes.has(naturalPlaceholderShape(v))) {
      return acc;
    }
    acc[v.key] = v.value as ComposerParamValue;
    return acc;
  }, {});

  let inlinedQuery = query;
  if (Object.keys(params).length > 0) {
    try {
      inlinedQuery = esql(query, params).inlineParams().print('basic');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        '[esql_rule_utils] Composer inlineParams failed, falling back to raw query',
        err
      );
      inlinedQuery = query;
    }
  }

  return { query: inlinedQuery, unresolved: findPlaceholderTokens(inlinedQuery) };
};
