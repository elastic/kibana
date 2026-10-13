/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Parser, Walker } from '@elastic/esql';
import { InvalidCustomResolutionRuleError } from '../../../errors';

const SYNTAX_ERROR_PREFIX = 'SyntaxError: ';

// `parseExpression` only says "Invalid command: EVAL …" on a syntax error, so
// the reason comes from parsing the expression inside a throwaway query.
const describeParseFailure = (source: string): string => {
  const syntaxError = Parser.parse(`FROM a | EVAL ${source}`).errors.find(({ message }) =>
    message.startsWith(SYNTAX_ERROR_PREFIX)
  );
  return syntaxError
    ? `ES|QL syntax error: ${syntaxError.message.slice(SYNTAX_ERROR_PREFIX.length)}`
    : 'must be a single ES|QL expression';
};

/**
 * Parses `source` as exactly one ES|QL expression and returns it re-printed
 * from the parsed tree. The matcher only ever composes the re-printed text, so
 * comments, pipes and extra commands in the input can never reach the query.
 *
 * @throws InvalidCustomResolutionRuleError naming `attribute`
 */
export const parseSingleEsqlExpression = (attribute: string, source: string): string => {
  let root: ReturnType<typeof Parser.parseExpression>['root'];
  try {
    // Keep the author's parentheses: re-deriving them from precedence can
    // change meaning, e.g. `a * (b / c)` under integer division.
    ({ root } = Parser.parseExpression(source, { withParens: true }));
  } catch {
    throw new InvalidCustomResolutionRuleError(describeParseFailure(source), attribute);
  }

  if (root.type === 'map') {
    throw new InvalidCustomResolutionRuleError('must be an expression, not a map', attribute);
  }

  if (root.type === 'function' && root.subtype === 'binary-expression' && root.name === '=') {
    throw new InvalidCustomResolutionRuleError(
      'must be an expression, not an assignment',
      attribute
    );
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
      'query parameters (`?name`) are not supported',
      attribute
    );
  }

  return BasicPrettyPrinter.expression(root);
};
