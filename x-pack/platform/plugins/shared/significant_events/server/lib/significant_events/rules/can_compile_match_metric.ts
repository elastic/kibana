/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';

const ALLOWED_COMMANDS = new Set(['from', 'where']);

/**
 * Drop only the last pipe segment when it is SORT / LIMIT / KEEP.
 * Must not use a greedy match from the first occurrence — that would also strip
 * a later WHERE (e.g. `… | KEEP cols | WHERE …` → `…`) and unfilter the count.
 */
const TRAILING_PIPE_COMMAND = /\s*\|\s*(?:SORT|LIMIT|KEEP)\b[^|]*$/i;

/** Peel trailing author SORT/LIMIT/KEEP so they cannot cap rows before COUNT. */
export function stripTrailingPipeCommands(query: string): string {
  let result = query.trimEnd();
  while (TRAILING_PIPE_COMMAND.test(result)) {
    result = result.replace(TRAILING_PIPE_COMMAND, '').trimEnd();
  }
  return result;
}

/**
 * Returns true when a stored MATCH KI can be compiled into a count metric-series
 * breach query. After peeling trailing SORT/LIMIT/KEEP, only filter-only MATCH
 * is eligible: `FROM` (optional METADATA) plus zero or more `WHERE` clauses —
 * no mid-pipeline STATS, KEEP, SORT, LIMIT, EVAL, etc.
 *
 * Ineligible queries must fail closed at install/promote — never fall back to
 * copying per-document rows into `.rule-events`.
 */
export function canCompileMatchMetric(esqlQuery: string): boolean {
  const trimmed = esqlQuery.trim();
  if (!trimmed) {
    return false;
  }

  const filterOnly = stripTrailingPipeCommands(trimmed);

  let root: ReturnType<typeof Parser.parse>['root'];
  try {
    ({ root } = Parser.parse(filterOnly));
  } catch {
    return false;
  }

  const commands = root.commands.filter(
    (cmd): cmd is { name: string } => 'name' in cmd && typeof cmd.name === 'string'
  );
  if (commands.length === 0 || commands[0].name !== 'from') {
    return false;
  }

  return commands.every((cmd) => ALLOWED_COMMANDS.has(cmd.name));
}

export function assertCanCompileMatchMetric(esqlQuery: string): void {
  if (!canCompileMatchMetric(esqlQuery)) {
    throw new Error(
      'MATCH query cannot be installed as a metric-series rule: expected a filter-only FROM … | WHERE … query without STATS. Refusing to install a per-document copy rule.'
    );
  }
}
