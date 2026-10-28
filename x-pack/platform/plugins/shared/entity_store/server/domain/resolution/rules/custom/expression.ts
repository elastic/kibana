/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Parser, Walker } from '@elastic/esql';
import { InvalidCustomResolutionRuleError } from '../../../errors';

const SYNTAX_ERROR_PREFIX = 'SyntaxError: ';
const NOT_A_SINGLE_EXPRESSION = 'must be a single ES|QL expression';

// `parseExpression` only says "Invalid command: EVAL …" on a syntax error, so
// the reason comes from parsing the expression inside a throwaway query.
const describeParseFailure = (source: string): string => {
  const syntaxError = Parser.parse(`FROM a | EVAL ${source}`).errors.find(({ message }) =>
    message.startsWith(SYNTAX_ERROR_PREFIX)
  );
  return syntaxError
    ? `ES|QL syntax error: ${syntaxError.message.slice(SYNTAX_ERROR_PREFIX.length)}`
    : NOT_A_SINGLE_EXPRESSION;
};

type ExpressionRoot = ReturnType<typeof Parser.parseExpression>['root'];

// Keep the author's parentheses: re-deriving them from precedence can change
// meaning, e.g. `a * (b / c)` under integer division.
const parseExpression = (source: string): ExpressionRoot =>
  Parser.parseExpression(source, { withParens: true }).root;

const reprintsUnchanged = (printed: string): boolean => {
  try {
    return BasicPrettyPrinter.expression(parseExpression(printed)) === printed;
  } catch {
    return false;
  }
};

/**
 * Parses `source` as exactly one ES|QL expression and returns it re-printed
 * from the parsed tree, plus whether it reads any field. The re-printed text
 * must itself parse back to the same text, so comments, pipes and extra
 * commands in the input can never reach the query, even through a printer that
 * writes a name unescaped.
 *
 * @throws InvalidCustomResolutionRuleError naming `attribute`
 */
export const normalizeSingleEsqlExpression = (
  attribute: string,
  source: string
): { expression: string; readsAField: boolean } => {
  let root: ExpressionRoot;
  try {
    root = parseExpression(source);
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
  let hasUnsafeInteger = false;
  let readsAField = false;
  Walker.walk(root, {
    visitColumn: () => {
      readsAField = true;
    },
    visitLiteral: (node) => {
      if (node.literalType === 'param') {
        hasParam = true;
      }
      if (node.literalType === 'integer' && !Number.isSafeInteger(node.value)) {
        hasUnsafeInteger = true;
      }
    },
  });
  if (hasParam) {
    throw new InvalidCustomResolutionRuleError(
      'query parameters (`?name`) are not supported',
      attribute
    );
  }
  // The parser stores numbers as JS numbers, so a larger integer would run as a
  // rounded value.
  if (hasUnsafeInteger) {
    throw new InvalidCustomResolutionRuleError(
      `integers beyond ±${Number.MAX_SAFE_INTEGER} are not supported; compare as a string`,
      attribute
    );
  }

  const printed = BasicPrettyPrinter.expression(root);
  if (!reprintsUnchanged(printed)) {
    throw new InvalidCustomResolutionRuleError(
      `${NOT_A_SINGLE_EXPRESSION} that re-prints exactly; rewrite it (numeric literals such as 1e21 aren't supported)`,
      attribute
    );
  }
  return { expression: printed, readsAField };
};
