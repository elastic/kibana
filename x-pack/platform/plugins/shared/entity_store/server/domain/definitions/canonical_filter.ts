/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Parser, Walker, isLiteral, isParamLiteral } from '@elastic/esql';

const SYNTAX_ERROR_PREFIX = 'SyntaxError: ';

const NON_BOOLEAN_LITERAL_TYPES: ReadonlySet<string> = new Set([
  'integer',
  'double',
  'keyword',
  'date_period',
  'time_duration',
]);

type ExpressionRoot = ReturnType<typeof Parser.parseExpression>['root'];

export type CanonicalEsqlFilterResult =
  | { readonly ok: true; readonly filter: string }
  | { readonly ok: false; readonly message: string };

// Keep the author's parentheses: re-deriving them from precedence can change meaning. The parser
// reports some invalid input by throwing rather than in `errors`, so both become a `message`.
const parseExpression = (
  source: string
): { readonly root: ExpressionRoot } | { readonly message: string } => {
  try {
    const { root, errors } = Parser.parseExpression(source, { withParens: true });
    return errors.length > 0 ? { message: errors[0].message } : { root };
  } catch (error) {
    return { message: error.message };
  }
};

// `parseExpression` only says "Invalid command: EVAL …" on a syntax error, so the reason comes
// from parsing the filter inside a throwaway query when that query has one.
const describeParseFailure = (source: string, message: string): string => {
  const syntaxError = Parser.parse(`FROM x | WHERE ${source}`).errors.find(({ message: text }) =>
    text.startsWith(SYNTAX_ERROR_PREFIX)
  );
  return syntaxError ? syntaxError.message : message;
};

const reprintsUnchanged = (printed: string): boolean => {
  const reparsed = parseExpression(printed);
  return 'root' in reparsed && BasicPrettyPrinter.expression(reparsed.root) === printed;
};

/**
 * Parses an author-written filter as exactly one boolean ES|QL expression and returns it re-printed
 * from its syntax tree, so two spellings of one expression give the same text. Returns the reason
 * in `message` when the filter is not acceptable, prefixed with `label`.
 */
export const canonicalizeEsqlFilter = (
  filter: string,
  label: string = 'source filter'
): CanonicalEsqlFilterResult => {
  const parsed = parseExpression(filter);
  if ('message' in parsed) {
    const reason = describeParseFailure(filter, parsed.message);
    return {
      ok: false,
      message: `${label} must be a single ES|QL expression: ${reason}: ${filter}`,
    };
  }
  const { root } = parsed;

  if (Walker.find(root, (node) => isParamLiteral(node))) {
    return { ok: false, message: `${label} must not contain query parameters: ${filter}` };
  }

  if (isLiteral(root) && NON_BOOLEAN_LITERAL_TYPES.has(root.literalType)) {
    return {
      ok: false,
      message: `${label} must be a boolean expression, not a ${root.literalType} literal: ${filter}`,
    };
  }

  const printed = BasicPrettyPrinter.expression(root);
  if (!reprintsUnchanged(printed)) {
    return {
      ok: false,
      message: `${label} must re-print unchanged from its syntax tree; rewrite it: ${filter}`,
    };
  }

  return { ok: true, filter: printed };
};
