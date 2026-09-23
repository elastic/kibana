/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, isAssignment, isColumn, isOptionNode, singleItems } from '@elastic/esql';
import type { ESQLAstItem, ESQLColumn, ESQLSingleAstItem } from '@elastic/esql/types';

// Anywhere in the expression, so `count_distinct(url.keyword)` matches `count_distinct(url)`.
const KEYWORD_SUFFIX = /\.keyword\b/gi;

// A BUCKET whose span is a time window: bind params, a duration literal, or a date literal.
const TIME_SPAN_ARGS =
  /\?_tstart|\?_tend|"\d{4}-\d{2}-\d{2}|\b\d+\s*(?:ms|milliseconds?|mo|months?|min|minutes?|sec|seconds?|hours?|days?|weeks?|quarters?|years?|[smhdwqy])\b/;
const BUCKET_CALL = /^bucket\s*\(\s*([^,)]+)(.*)\)$/;

/**
 * True when two Lens/Vega column names refer to the same ES|QL expression after
 * resolving STATS/EVAL/BY aliases. Column alias wording is ignored; `.keyword`
 * twins (as a grouping or inside an aggregation), COUNT()/COUNT(*),
 * HOUR()/DATE_EXTRACT hour-of-day, and TBUCKET / time-span BUCKET buckets count
 * as the same expression. A numeric BUCKET matches only on its bucketed field.
 */
export function columnsReferToSameExpression(
  goldColumn: string,
  goldQuery: string,
  actualColumn: string,
  actualQuery: string
): boolean {
  // A structural-only gold has no query; its column names then refer to the
  // aliases of the query that was actually produced.
  return expressionsEquivalent(
    resolveColumnExpression(goldColumn, goldQuery || actualQuery),
    resolveColumnExpression(actualColumn, actualQuery || goldQuery)
  );
}

/** The normalized expression a chart column name stands for in a query (alias -> source). */
export function resolveColumnExpression(column: string, query: string): string {
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
  if (/^tbucket\s*\(/.test(normalized)) {
    return 'time_bucket';
  }
  const bucket = BUCKET_CALL.exec(normalized);
  if (bucket) {
    const [, field, spanArgs] = bucket;
    return TIME_SPAN_ARGS.test(spanArgs) ? 'time_bucket' : `bucket(${field.trim()})`;
  }
  return normalized;
}
