/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';

export const getExpressionColumnReferences = (expression: string): string[] => {
  if (!expression.trim()) return [];

  let parsed: ReturnType<typeof Parser.parseExpression>;

  try {
    parsed = Parser.parseExpression(expression);
  } catch (e) {
    return [];
  }

  const { root, errors } = parsed;
  if (errors.length) return [];

  const columns = Walker.matchAll(root, { type: 'column' });
  return [...new Set(columns.map((column) => column.name))];
};

export const getInvalidExpressionReferences = (
  expression: string,
  availableLabels: string[]
): string[] =>
  getExpressionColumnReferences(expression).filter((column) => !availableLabels.includes(column));
