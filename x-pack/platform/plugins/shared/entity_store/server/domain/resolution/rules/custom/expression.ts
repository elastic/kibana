/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Parser, Walker } from '@elastic/esql';
import { getErrorMessage } from '../../../../../common';
import { InvalidCustomResolutionRuleError } from '../../../errors';

/**
 * Parses `source` as exactly one ES|QL expression and returns it re-printed
 * from the parsed tree. The matcher only ever composes the re-printed text, so
 * comments, pipes and extra commands in the input can never reach the query.
 *
 * @throws InvalidCustomResolutionRuleError naming `field`
 */
export const normalizeEsqlExpression = (field: string, source: string): string => {
  let parsed: ReturnType<typeof Parser.parseExpression>;
  try {
    parsed = Parser.parseExpression(source);
  } catch (error) {
    throw new InvalidCustomResolutionRuleError(
      field,
      `must be a single ES|QL expression (${getErrorMessage(error)})`
    );
  }

  const { root, errors } = parsed;
  if (errors.length > 0) {
    throw new InvalidCustomResolutionRuleError(
      field,
      `ES|QL syntax error: ${errors.map((error) => error.message).join('; ')}`
    );
  }

  if (root.type === 'map') {
    throw new InvalidCustomResolutionRuleError(field, 'must be an expression, not a map');
  }

  if (root.type === 'function' && root.subtype === 'binary-expression' && root.name === '=') {
    throw new InvalidCustomResolutionRuleError(field, 'must be an expression, not an assignment');
  }

  let hasParam = false;
  Walker.walk(root, {
    visitLiteral: (node) => {
      if (node.literalType === 'param') {
        hasParam = true;
      }
    },
  });
  if (hasParam) {
    throw new InvalidCustomResolutionRuleError(
      field,
      'query parameters (`?name`) are not supported'
    );
  }

  return BasicPrettyPrinter.expression(root);
};
