/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  const goldExpression = resolveColumnExpression(goldColumn, goldQuery);
  const actualExpression = resolveColumnExpression(actualColumn, actualQuery);
  return expressionsEquivalent(goldExpression, actualExpression);
}

export function resolveColumnExpression(column: string, query: string): string {
  const aliases = buildAliasMap(query);
  const key = normalizeIdentifier(column);
  return aliases.get(key) ?? normalizeExpression(column);
}

function buildAliasMap(query: string): Map<string, string> {
  const aliases = new Map<string, string>();
  if (!query) {
    return aliases;
  }

  for (const rawCommand of splitPipes(query)) {
    const command = rawCommand.trim();
    const statsMatch = command.match(/^STATS\s+([\s\S]+)$/i);
    if (statsMatch) {
      addStatsAliases(aliases, statsMatch[1]);
      continue;
    }
    const evalMatch = command.match(/^EVAL\s+([\s\S]+)$/i);
    if (evalMatch) {
      addAssignments(aliases, evalMatch[1]);
    }
  }

  return aliases;
}

function addStatsAliases(aliases: Map<string, string>, body: string): void {
  const [aggregates, grouping] = splitTopLevelBy(body);
  addAssignments(aliases, aggregates);
  if (grouping) {
    addAssignments(aliases, grouping);
  }
}

function addAssignments(aliases: Map<string, string>, clause: string): void {
  for (const item of splitTopLevel(clause, ',')) {
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }
    const assignment = splitTopLevelAssignment(trimmed);
    if (assignment) {
      const aliasKey = normalizeIdentifier(assignment.alias);
      const expression = normalizeExpression(assignment.expression);
      aliases.set(aliasKey, expression);
      aliases.set(expression, expression);
    } else {
      const identifier = normalizeIdentifier(trimmed);
      // Bare identifiers in later STATS BY/EVAL clauses often reuse an earlier
      // EVAL alias; keep the resolved expression instead of overwriting it.
      if (aliases.has(identifier)) {
        continue;
      }
      const expression = normalizeExpression(trimmed);
      aliases.set(expression, expression);
      aliases.set(identifier, expression);
    }
  }
}

function splitPipes(query: string): string[] {
  return splitTopLevel(query.replace(/\r\n/g, '\n'), '|');
}

function splitTopLevelBy(body: string): [string, string | undefined] {
  let depth = 0;
  let quote: '"' | "'" | '`' | null = null;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quote) {
      if (ch === quote && body[i - 1] !== '\\') {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '(') {
      depth++;
      continue;
    }
    if (ch === ')') {
      depth--;
      continue;
    }
    if (depth === 0 && isBySeparator(body, i)) {
      return [body.slice(0, i), body.slice(i + 3)];
    }
  }

  return [body, undefined];
}

function isBySeparator(source: string, index: number): boolean {
  if (!/\s/.test(source[index] ?? '')) {
    return false;
  }
  if (source.slice(index + 1, index + 3).toUpperCase() !== 'BY') {
    return false;
  }
  const after = source[index + 3];
  return after === undefined || /\s/.test(after);
}

function splitTopLevel(source: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote: '"' | "'" | '`' | null = null;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      current += ch;
      if (ch === quote && source[i - 1] !== '\\') {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(') {
      depth++;
      current += ch;
      continue;
    }
    if (ch === ')') {
      depth--;
      current += ch;
      continue;
    }
    if (depth === 0 && source.startsWith(delimiter, i)) {
      parts.push(current);
      current = '';
      i += delimiter.length - 1;
      continue;
    }
    current += ch;
  }

  parts.push(current);
  return parts;
}

function splitTopLevelAssignment(item: string): { alias: string; expression: string } | undefined {
  let depth = 0;
  let quote: '"' | "'" | '`' | null = null;

  for (let i = 0; i < item.length; i++) {
    const ch = item[i];
    if (quote) {
      if (ch === quote && item[i - 1] !== '\\') {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '(') {
      depth++;
      continue;
    }
    if (ch === ')') {
      depth--;
      continue;
    }
    if (depth === 0 && ch === '=' && item[i + 1] !== '=') {
      const alias = item.slice(0, i).trim();
      const expression = item.slice(i + 1).trim();
      if (alias && expression) {
        return { alias, expression };
      }
    }
  }

  return undefined;
}

function expressionsEquivalent(left: string, right: string): boolean {
  if (left === right) {
    return true;
  }
  if (left === 'time_bucket' && right === 'time_bucket') {
    return true;
  }
  return isKeywordTwin(left, right);
}

function isKeywordTwin(left: string, right: string): boolean {
  const strippedLeft = left.replace(KEYWORD_SUFFIX, '');
  const strippedRight = right.replace(KEYWORD_SUFFIX, '');
  return strippedLeft === strippedRight && strippedLeft.length > 0;
}

function normalizeIdentifier(value: string): string {
  return stripTicks(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

function normalizeExpression(value: string): string {
  let normalized = stripTicks(value).replace(/\s+/g, ' ').trim().toLowerCase();
  normalized = normalized.replace(/\bcount\s*\(\s*\)/g, 'count(*)');
  normalized = normalized.replace(
    /\bdate_extract\s*\(\s*["']hour_of_day["']\s*,\s*([^)]+)\)/g,
    'hour($1)'
  );
  if (/^tbucket\s*\(/i.test(normalized) || /^bucket\s*\(/i.test(normalized)) {
    return 'time_bucket';
  }
  return normalized;
}

function stripTicks(value: string): string {
  return value.replace(/`/g, '');
}
