/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Walker,
  Builder,
  type ESQLSingleAstItem,
  type ESQLAstQueryExpression,
} from '@kbn/esql-language';

/**
 * Converts a JavaScript array to an ESQL list literal expression.
 */
function arrayToLiteral(array: string[] | number[]): ESQLSingleAstItem {
  return Builder.expression.list.literal({
    values: array.map((item) => {
      if (typeof item === 'number') {
        return Number.isInteger(item)
          ? Builder.expression.literal.integer(item)
          : Builder.expression.literal.decimal(item);
      }

      return Builder.expression.literal.string(item);
    }),
  });
}

/**
 * Inlines array parameters in the query AST by replacing parameter placeholders
 * with list literal expressions.
 */
export function inlineArrayParams(
  ast: ESQLAstQueryExpression,
  params: Record<string, string[] | number[]>
): void {
  for (const [paramName, paramValue] of Object.entries(params)) {
    // Create a list literal AST node from the array
    const listLiteral = arrayToLiteral(paramValue);

    // Replace all occurrences of this parameter with the list literal
    Walker.replaceAll(
      ast,
      { type: 'literal', literalType: 'param', value: paramName },
      listLiteral
    );
  }
}
