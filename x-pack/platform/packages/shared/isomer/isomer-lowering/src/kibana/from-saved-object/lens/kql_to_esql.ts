/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringLiteral } from './esql';

type Token =
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'op'; value: ':' | '>=' | '<=' | '>' | '<' }
  | { type: 'string'; value: string }
  | { type: 'word'; value: string };

const tokenize = (input: string): Token[] | undefined => {
  const tokens: Token[] = [];
  let i = 0;
  const isBoundary = (ch: string): boolean =>
    ch === ' ' ||
    ch === '\t' ||
    ch === '\n' ||
    ch === '\r' ||
    ch === '(' ||
    ch === ')' ||
    ch === ':' ||
    ch === '<' ||
    ch === '>' ||
    ch === '"';
  while (i < input.length) {
    const ch = input[i]!;
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i += 1;
      continue;
    }
    if (ch === ':') {
      tokens.push({ type: 'op', value: ':' });
      i += 1;
      continue;
    }
    if (ch === '>' || ch === '<') {
      if (input[i + 1] === '=') {
        tokens.push({ type: 'op', value: ch === '>' ? '>=' : '<=' });
        i += 2;
      } else {
        tokens.push({ type: 'op', value: ch });
        i += 1;
      }
      continue;
    }
    if (ch === '"') {
      i += 1;
      let value = '';
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length) {
          value += input[i + 1];
          i += 2;
          continue;
        }
        value += input[i];
        i += 1;
      }
      if (input[i] !== '"') {
        return undefined; // unterminated string
      }
      i += 1;
      tokens.push({ type: 'string', value });
      continue;
    }
    let word = '';
    while (i < input.length && !isBoundary(input[i]!)) {
      word += input[i];
      i += 1;
    }
    if (word === '') {
      return undefined;
    }
    tokens.push({ type: 'word', value: word });
  }
  return tokens;
};

const isKeyword = (token: Token | undefined, keyword: string): boolean =>
  token?.type === 'word' && token.value.toLowerCase() === keyword;

const NUMERIC = /^-?\d+(?:\.\d+)?$/;

interface ParserState {
  tokens: Token[];
  pos: number;
}

const peek = (state: ParserState): Token | undefined => state.tokens[state.pos];

const buildComparison = (
  field: string,
  op: ':' | '>=' | '<=' | '>' | '<',
  value: Token,
  escapeField: (field: string) => string
): string | undefined => {
  if (value.type !== 'word' && value.type !== 'string') {
    return undefined;
  }
  if (value.value.includes('*')) {
    return undefined;
  }
  const esField = escapeField(field);
  const numeric = value.type === 'word' && NUMERIC.test(value.value);
  if (numeric) {
    const comparator = op === ':' ? '==' : op;
    return `TO_DOUBLE(${esField}) ${comparator} ${value.value}`;
  }
  const booleanLiteral =
    value.type === 'word' &&
    (value.value.toLowerCase() === 'true' || value.value.toLowerCase() === 'false')
      ? value.value.toLowerCase()
      : undefined;
  if (booleanLiteral) {
    return op === ':' ? `${esField} == ${booleanLiteral}` : undefined;
  }
  if (op === ':') {
    return `${esField} == ${escapeStringLiteral(value.value)}`;
  }
  return `${esField} ${op} ${escapeStringLiteral(value.value)}`;
};

const parseOr = (
  state: ParserState,
  escapeField: (field: string) => string
): string | undefined => {
  const first = parseAnd(state, escapeField);
  if (first === undefined) {
    return undefined;
  }
  const parts = [first];
  while (isKeyword(peek(state), 'or')) {
    state.pos += 1;
    const next = parseAnd(state, escapeField);
    if (next === undefined) {
      return undefined;
    }
    parts.push(next);
  }
  return parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`;
};

const parseAnd = (
  state: ParserState,
  escapeField: (field: string) => string
): string | undefined => {
  const first = parseNot(state, escapeField);
  if (first === undefined) {
    return undefined;
  }
  const parts = [first];
  while (isKeyword(peek(state), 'and')) {
    state.pos += 1;
    const next = parseNot(state, escapeField);
    if (next === undefined) {
      return undefined;
    }
    parts.push(next);
  }
  return parts.length === 1 ? parts[0] : `(${parts.join(' AND ')})`;
};

const parseNot = (
  state: ParserState,
  escapeField: (field: string) => string
): string | undefined => {
  if (isKeyword(peek(state), 'not')) {
    state.pos += 1;
    const inner = parseNot(state, escapeField);
    return inner === undefined ? undefined : `NOT (${inner})`;
  }
  return parsePrimary(state, escapeField);
};

const parsePrimary = (
  state: ParserState,
  escapeField: (field: string) => string
): string | undefined => {
  const token = peek(state);
  if (token?.type === 'lparen') {
    state.pos += 1;
    const inner = parseOr(state, escapeField);
    if (inner === undefined || peek(state)?.type !== 'rparen') {
      return undefined;
    }
    state.pos += 1;
    return inner;
  }
  if (
    token?.type !== 'word' ||
    isKeyword(token, 'and') ||
    isKeyword(token, 'or') ||
    isKeyword(token, 'not')
  ) {
    return undefined;
  }
  const opToken = state.tokens[state.pos + 1];
  if (opToken?.type !== 'op') {
    return undefined;
  }
  const valueToken = state.tokens[state.pos + 2];
  if (!valueToken) {
    return undefined;
  }
  const comparison = buildComparison(token.value, opToken.value, valueToken, escapeField);
  if (comparison === undefined) {
    return undefined;
  }
  state.pos += 3;
  return comparison;
};

export const translateKqlToEsql = (
  query: string,
  escapeField: (field: string) => string
): string | undefined => {
  if (query.trim() === '') {
    return 'true';
  }
  const tokens = tokenize(query);
  if (!tokens || tokens.length === 0) {
    return undefined;
  }
  const state: ParserState = { tokens, pos: 0 };
  const result = parseOr(state, escapeField);
  if (result === undefined || state.pos !== tokens.length) {
    return undefined;
  }
  return result;
};
