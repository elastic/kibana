/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, isAssignment, isColumn, isOptionNode, singleItems } from '@elastic/esql';
import type { ESQLAstItem, ESQLColumn, ESQLSingleAstItem } from '@elastic/esql/types';

const KEYWORD_SUFFIX = /\.keyword$/i;

/**
 * True when two Lens/Vega column names refer to the same ES|QL expression after
 * resolving STATS/EVAL/BY aliases. Column alias wording is ignored; `.keyword`
 * twins, COUNT()/COUNT(*), HOUR()/DATE_EXTRACT hour-of-day, and BUCKET/TBUCKET
 * time buckets count as the same expression.
 */
export function columnsReferToSameExpression(
  goldColumn: string,
  goldQuery: string,
  actualColumn: string,
  actualQuery: string
): boolean {
  return expressionsEquivalent(
    resolveColumnExpression(goldColumn, goldQuery),
    resolveColumnExpression(actualColumn, actualQuery)
  );
}

function resolveColumnExpression(column: string, query: string): string {
  const key = normalizeExpression(column);
  return buildAliasMap(query).get(key) ?? key;
}

function buildAliasMap(query: string): Map<string, string> {
  const aliases = new Map<string, string>();
  if (!query) {
    return aliases;
  }

  for (const command of Parser.parse(query).root.commands) {
    if (command.name !== 'stats' && command.name !== 'eval') {
      continue;
    }
    for (const arg of command.args) {
      addFields(aliases, arg, query);
    }
  }

  return aliases;
}

function addFields(aliases: Map<string, string>, arg: ESQLAstItem, query: string): void {
  if (Array.isArray(arg)) {
    for (const item of arg) {
      addFields(aliases, item, query);
    }
    return;
  }

  if (isOptionNode(arg) && arg.name === 'by') {
    for (const grouping of arg.args) {
      addFields(aliases, grouping, query);
    }
    return;
  }

  if (isAssignment(arg)) {
    const [left, right] = [...singleItems(arg.args)];
    if (isColumn(left) && right && !Array.isArray(right)) {
      recordAlias(aliases, columnName(left), sourceOf(right, query));
    }
    return;
  }

  if (isColumn(arg)) {
    const name = columnName(arg);
    if (!aliases.has(normalizeExpression(name))) {
      recordAlias(aliases, name, name);
    }
  }
}

function recordAlias(aliases: Map<string, string>, name: string, expressionSource: string): void {
  const expression = normalizeExpression(expressionSource);
  aliases.set(normalizeExpression(name), expression);
  aliases.set(expression, expression);
}

function columnName(column: ESQLColumn): string {
  return column.parts.length > 0 ? column.parts.join('.') : column.name;
}

function sourceOf(node: ESQLSingleAstItem, query: string): string {
  return query.slice(node.location.min, node.location.max + 1);
}

function expressionsEquivalent(left: string, right: string): boolean {
  if (left === right) {
    return true;
  }
  const strippedLeft = left.replace(KEYWORD_SUFFIX, '');
  const strippedRight = right.replace(KEYWORD_SUFFIX, '');
  return strippedLeft === strippedRight && strippedLeft.length > 0;
}

function normalizeExpression(value: string): string {
  let normalized = value.replace(/`/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  normalized = normalized.replace(/\bcount\s*\(\s*\)/g, 'count(*)');
  normalized = normalized.replace(
    /\bdate_extract\s*\(\s*["']hour_of_day["']\s*,\s*([^)]+)\)/g,
    'hour($1)'
  );
  if (/^t?bucket\s*\(/.test(normalized)) {
    return 'time_bucket';
  }
  return normalized;
}
