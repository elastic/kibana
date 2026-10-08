/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@elastic/esql';
import type { ESQLSingleAstItem } from '@elastic/esql/types';
import {
  type Condition,
  type FilterCondition,
  isAlwaysCondition,
  isAndCondition,
  isFilterCondition,
  isNeverCondition,
  isNotCondition,
  isOrCondition,
} from '../../../types/conditions';
import { esqlLiteralFromAny } from './condition_to_esql';

type ComparisonOperator = '==' | '!=' | '>' | '>=' | '<' | '<=';

const COMPLEMENT: Record<ComparisonOperator, ComparisonOperator> = {
  '==': '!=',
  '!=': '==',
  '>': '<=',
  '>=': '<',
  '<': '>=',
  '<=': '>',
};

interface Comparison {
  operator: ComparisonOperator;
  value: unknown;
}

// `matchesNull` is the leaf's COALESCE default in conditionToESQLAst.
type Leaf =
  | { comparisons: Comparison[]; matchesNull: boolean }
  | { call: ESQLSingleAstItem; matchesNull: boolean };

const or = (left: ESQLSingleAstItem, right: ESQLSingleAstItem) =>
  Builder.expression.func.binary('or', [left, right]);

const and = (left: ESQLSingleAstItem, right: ESQLSingleAstItem) =>
  Builder.expression.func.binary('and', [left, right]);

const toLeaf = (condition: FilterCondition): Leaf | undefined => {
  const field = Builder.expression.column(condition.field);

  if ('eq' in condition) {
    return { comparisons: [{ operator: '==', value: condition.eq }], matchesNull: false };
  }
  if ('neq' in condition) {
    return { comparisons: [{ operator: '!=', value: condition.neq }], matchesNull: true };
  }
  if ('gt' in condition) {
    return { comparisons: [{ operator: '>', value: condition.gt }], matchesNull: false };
  }
  if ('gte' in condition) {
    return { comparisons: [{ operator: '>=', value: condition.gte }], matchesNull: false };
  }
  if ('lt' in condition) {
    return { comparisons: [{ operator: '<', value: condition.lt }], matchesNull: false };
  }
  if ('lte' in condition) {
    return { comparisons: [{ operator: '<=', value: condition.lte }], matchesNull: false };
  }
  if ('range' in condition && condition.range) {
    const { gt, gte, lt, lte } = condition.range;
    const comparisons: Comparison[] = [];
    if (gt !== undefined) comparisons.push({ operator: '>', value: gt });
    if (gte !== undefined) comparisons.push({ operator: '>=', value: gte });
    if (lt !== undefined) comparisons.push({ operator: '<', value: lt });
    if (lte !== undefined) comparisons.push({ operator: '<=', value: lte });
    return { comparisons, matchesNull: false };
  }
  if ('contains' in condition) {
    return {
      call: Builder.expression.func.call('CONTAINS', [
        Builder.expression.func.call('TO_LOWER', [field]),
        Builder.expression.literal.string(String(condition.contains).toLowerCase()),
      ]),
      matchesNull: false,
    };
  }
  if ('startsWith' in condition) {
    return {
      call: Builder.expression.func.call('STARTS_WITH', [
        field,
        Builder.expression.literal.string(String(condition.startsWith)),
      ]),
      matchesNull: false,
    };
  }
  if ('endsWith' in condition) {
    return {
      call: Builder.expression.func.call('ENDS_WITH', [
        field,
        Builder.expression.literal.string(String(condition.endsWith)),
      ]),
      matchesNull: false,
    };
  }
  if ('includes' in condition) {
    return {
      call: Builder.expression.func.call('MV_CONTAINS', [
        field,
        esqlLiteralFromAny(condition.includes),
      ]),
      matchesNull: false,
    };
  }
  return undefined;
};

const filterLeafToAst = (condition: FilterCondition, negated: boolean): ESQLSingleAstItem => {
  const field = () => Builder.expression.column(condition.field);
  const isNull = () => Builder.expression.func.postfix('IS NULL', field());

  if ('exists' in condition) {
    return condition.exists !== negated
      ? Builder.expression.func.call('NOT', [isNull()])
      : isNull();
  }

  const leaf = toLeaf(condition);
  if (!leaf) {
    return Builder.expression.literal.boolean(negated);
  }

  const compare = ({ operator, value }: Comparison): ESQLSingleAstItem =>
    Builder.expression.func.binary(negated ? COMPLEMENT[operator] : operator, [
      field(),
      esqlLiteralFromAny(value),
    ]);

  const predicate =
    'call' in leaf
      ? negated
        ? Builder.expression.func.unary('NOT', leaf.call)
        : leaf.call
      : leaf.comparisons.map(compare).reduce(negated ? or : and);

  return leaf.matchesNull !== negated ? or(predicate, isNull()) : predicate;
};

const toFilterAst = (condition: Condition, negated: boolean): ESQLSingleAstItem => {
  if (isFilterCondition(condition)) {
    return filterLeafToAst(condition, negated);
  }
  if (isAndCondition(condition)) {
    return condition.and.map((child) => toFilterAst(child, negated)).reduce(negated ? or : and);
  }
  if (isOrCondition(condition)) {
    return condition.or.map((child) => toFilterAst(child, negated)).reduce(negated ? and : or);
  }
  if (isNotCondition(condition)) {
    return toFilterAst(condition.not, !negated);
  }
  if (isAlwaysCondition(condition)) {
    return Builder.expression.literal.boolean(!negated);
  }
  if (isNeverCondition(condition)) {
    return Builder.expression.literal.boolean(negated);
  }
  return Builder.expression.literal.boolean(false);
};

/**
 * Pushdown-friendly (COALESCE-free) `WHERE` predicate selecting the same rows as
 * `conditionToESQLAst`, except negated multi-valued fields; only valid as a filter, not a value.
 */
export const conditionToESQLFilterAst = (condition: Condition): ESQLSingleAstItem => {
  const ast = toFilterAst(condition, false);
  // `esql.exp` re-parses spliced ASTs as text: a bare OR would bind looser than a surrounding AND
  return ast.type === 'function' && ast.name === 'or' ? Builder.expression.parens(ast) : ast;
};
