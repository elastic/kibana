/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLFieldWithMetadata } from '@kbn/esql-types';

/**
 * Client-side inference of the datafeed `source_time_field` (g2sz.18, decision
 * D-1 in docs/projects/esql-datafeeds/tp-feedback.md). The API keeps the field
 * explicit; the wizard only uses this to pre-fill it. It is a best-effort text
 * scan, not an ES|QL parser: whenever the query shape is ambiguous it returns
 * `undefined` and the server 400 remains the backstop.
 */

type TokenKind = 'name' | 'param' | 'string' | 'number' | 'punct';

interface Token {
  kind: TokenKind;
  text: string;
}

const BACKTICK_PART = '`(?:[^`]|``)*`';
const NAME_PART = `(?:${BACKTICK_PART}|[A-Za-z_@][\\w@]*)`;
// A (possibly dotted, possibly backtick-quoted) field name is a single token.
const NAME_REGEX = new RegExp(`^${NAME_PART}(?:\\.(?:${BACKTICK_PART}|[\\w@]+))*`);
const NAME_PART_REGEX = new RegExp(`${BACKTICK_PART}|[^.\`]+`, 'g');
const NUMBER_REGEX = /^\d+(?:\.\d+)?/;
const PARAM_REGEX = /^\?+[\w@]*/;
const PUNCT_REGEX = /^(?:==|!=|<=|>=|=~|[=,()|+\-*/%<>[\]:.])/;

const DATE_TYPES = new Set(['date', 'date_nanos']);
const AGGREGATING_COMMANDS = new Set(['STATS', 'INLINESTATS', 'INLINE']);

const tokenize = (query: string): Token[] => {
  const tokens: Token[] = [];
  let rest = query;

  while (rest.length > 0) {
    const whitespace = /^\s+/.exec(rest);
    if (whitespace) {
      rest = rest.slice(whitespace[0].length);
      continue;
    }
    if (rest.startsWith('//')) {
      const newline = rest.indexOf('\n');
      rest = newline === -1 ? '' : rest.slice(newline + 1);
      continue;
    }
    if (rest.startsWith('/*')) {
      const end = rest.indexOf('*/', 2);
      rest = end === -1 ? '' : rest.slice(end + 2);
      continue;
    }
    if (rest.startsWith('"""')) {
      const end = rest.indexOf('"""', 3);
      const length = end === -1 ? rest.length : end + 3;
      tokens.push({ kind: 'string', text: rest.slice(0, length) });
      rest = rest.slice(length);
      continue;
    }
    if (rest.startsWith('"')) {
      const match = /^"(?:\\.|[^"\\])*"?/.exec(rest);
      const text = match ? match[0] : rest;
      tokens.push({ kind: 'string', text });
      rest = rest.slice(text.length);
      continue;
    }

    const param = PARAM_REGEX.exec(rest);
    if (param) {
      tokens.push({ kind: 'param', text: param[0] });
      rest = rest.slice(param[0].length);
      continue;
    }
    const number = NUMBER_REGEX.exec(rest);
    if (number) {
      tokens.push({ kind: 'number', text: number[0] });
      rest = rest.slice(number[0].length);
      continue;
    }
    const name = NAME_REGEX.exec(rest);
    if (name) {
      tokens.push({ kind: 'name', text: name[0] });
      rest = rest.slice(name[0].length);
      continue;
    }
    const punct = PUNCT_REGEX.exec(rest);
    const text = punct ? punct[0] : rest[0];
    tokens.push({ kind: 'punct', text });
    rest = rest.slice(text.length);
  }

  return tokens;
};

/** `` `a`.b `` -> `a.b`; an unterminated/odd token falls back to its raw text. */
const toFieldName = (token: string): string =>
  (token.match(NAME_PART_REGEX) ?? [token])
    .map((part) =>
      part.startsWith('`') && part.endsWith('`') && part.length >= 2
        ? part.slice(1, -1).replace(/``/g, '`')
        : part
    )
    .join('.');

const isPunct = (token: Token | undefined, text: string) =>
  token?.kind === 'punct' && token.text === text;

/** Splits tokens on `separator` at parenthesis depth 0. */
const splitTopLevel = (tokens: Token[], separator: string): Token[][] => {
  const parts: Token[][] = [[]];
  let depth = 0;

  for (const token of tokens) {
    if (isPunct(token, '(') || isPunct(token, '[')) depth++;
    if (isPunct(token, ')') || isPunct(token, ']')) depth = Math.max(0, depth - 1);
    if (depth === 0 && isPunct(token, separator)) {
      parts.push([]);
    } else {
      parts[parts.length - 1].push(token);
    }
  }

  return parts;
};

const asPlainFieldName = (argument: Token[]): string | undefined =>
  argument.length === 1 && argument[0].kind === 'name' ? toFieldName(argument[0].text) : undefined;

/** Column names introduced by `EVAL x = ...` / `RENAME a AS x` (not raw index fields). */
const collectDerivedNames = (commands: Token[][]): Set<string> => {
  const derived = new Set<string>();

  for (const command of commands) {
    const keyword = command[0]?.text.toUpperCase();
    if (keyword !== 'EVAL' && keyword !== 'RENAME') continue;

    for (const item of splitTopLevel(command.slice(1), ',')) {
      if (keyword === 'EVAL' && item[0]?.kind === 'name' && isPunct(item[1], '=')) {
        derived.add(toFieldName(item[0].text));
      } else if (keyword === 'RENAME') {
        const asIndex = item.findIndex(
          (token) => token.kind === 'name' && token.text.toUpperCase() === 'AS'
        );
        const target = asIndex === -1 ? undefined : asPlainFieldName(item.slice(asIndex + 1));
        const assigned = isPunct(item[1], '=') ? asPlainFieldName(item.slice(0, 1)) : target;
        if (assigned !== undefined) derived.add(assigned);
      }
    }
  }

  return derived;
};

/** Field named by the first depth-0 BUCKET / DATE_TRUNC / TBUCKET call, if any call exists. */
const findBucketingCall = (
  tokens: Token[]
): { found: false } | { found: true; field: string | undefined } => {
  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (isPunct(token, '(') || isPunct(token, '[')) depth++;
    if (isPunct(token, ')') || isPunct(token, ']')) depth = Math.max(0, depth - 1);

    const callName = token.kind === 'name' ? token.text.toUpperCase() : undefined;
    if (
      depth !== 0 ||
      !isPunct(tokens[i + 1], '(') ||
      (callName !== 'BUCKET' && callName !== 'DATE_TRUNC' && callName !== 'TBUCKET')
    ) {
      continue;
    }

    let end = i + 2;
    let innerDepth = 1;
    while (end < tokens.length && innerDepth > 0) {
      if (isPunct(tokens[end], '(') || isPunct(tokens[end], '[')) innerDepth++;
      if (isPunct(tokens[end], ')') || isPunct(tokens[end], ']')) innerDepth--;
      end++;
    }
    const args = splitTopLevel(tokens.slice(i + 2, innerDepth === 0 ? end - 1 : end), ',');

    if (callName === 'TBUCKET') {
      // TBUCKET(<buckets>) always buckets the implicit @timestamp field.
      return { found: true, field: args.length === 1 ? '@timestamp' : undefined };
    }

    return { found: true, field: asPlainFieldName(args[callName === 'BUCKET' ? 0 : 1] ?? []) };
  }

  return { found: false };
};

/**
 * Infers the raw index field a datafeed query buckets on:
 * 1. the field inside the first top-level `BUCKET(<field>, ...)` /
 *    `DATE_TRUNC(<interval>, <field>)` (or `@timestamp` for `TBUCKET(<buckets>)`)
 *    call, when it is a plain identifier that is not derived by EVAL/RENAME;
 * 2. otherwise, for a query without aggregation, the single `date` / `date_nanos`
 *    output column, unless it is derived by EVAL/RENAME;
 * 3. otherwise `undefined`.
 */
export const inferSourceTimeField = (
  query: string,
  columns: ESQLFieldWithMetadata[]
): string | undefined => {
  const tokens = tokenize(query);
  const commands = splitTopLevel(tokens, '|');
  const derivedNames = collectDerivedNames(commands);

  const bucketing = findBucketingCall(tokens);
  if (bucketing.found && bucketing.field !== undefined && !derivedNames.has(bucketing.field)) {
    return bucketing.field;
  }

  const isAggregating = commands.some((command) =>
    AGGREGATING_COMMANDS.has(command[0]?.text.toUpperCase() ?? '')
  );
  if (isAggregating) return undefined;

  const dateColumns = columns.filter(({ type }) => DATE_TYPES.has(type));
  if (dateColumns.length !== 1 || derivedNames.has(dateColumns[0].name)) return undefined;

  return dateColumns[0].name;
};
