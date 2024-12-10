/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Walker, type ESQLAstQueryExpression } from '@kbn/esql-ast';
import { isLikeOperatorNode, isStringLiteralNode } from '../typeguards';
import type { ESQLLikeOperator, ESQLStringLiteral } from '../types';
import type { QueryCorrection } from './types';

/**
 * Correct wrong LIKE wildcard mistakes.
 * The LLM can make mistake and use SQL wildcards for LIKE operators.
 *
 * E.g.
 * `column LIKE "ba_"` => `column LIKE "ba?"`
 * `column LIKE "ba%"` => `column LIKE "ba*"`
 */
export const correctLikeWildcards = (query: ESQLAstQueryExpression): QueryCorrection[] => {
  const corrections: QueryCorrection[] = [];

  Walker.walk(query, {
    visitFunction: (node) => {
      if (isLikeOperatorNode(node)) {
        corrections.push(...checkLikeNode(node));
      }
    },
  });

  return corrections;
};

function checkLikeNode(node: ESQLLikeOperator): QueryCorrection[] {
  if (node.args.length !== 2 || !isStringLiteralNode(node.args[1])) {
    return [];
  }
  const likeExpression = node.args[1] as ESQLStringLiteral;

  const initialValue = likeExpression.value;

  likeExpression.value = likeExpression.value
    .replaceAll(/(?<!\\)%/g, '*')
    .replaceAll(/(?<!\\)_/g, '?');

  if (likeExpression.value !== initialValue) {
    likeExpression.name = likeExpression.value;

    const correction: QueryCorrection = {
      type: 'wrong_like_wildcard',
      node,
      description: `Replaced wrong like wildcard in LIKE operator at position ${node.location.min}`,
    };
    return [correction];
  }

  return [];
}
