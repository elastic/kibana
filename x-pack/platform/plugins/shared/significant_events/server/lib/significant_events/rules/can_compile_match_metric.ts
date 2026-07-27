/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { ESQLCommand } from '@elastic/esql/types';

/** After peeling trailing commands, only these may remain for a filter-only MATCH. */
const ALLOWED_BASE_COMMANDS = new Set(['from', 'where']);

/** Author commands that only cap/shape rows and are safe to peel from the tail. */
const TRAILING_COMMANDS = new Set(['sort', 'limit', 'keep']);

interface FilterOnlyParse {
  /** Query source with the trailing run of SORT/LIMIT/KEEP peeled off. */
  base: string;
  /** Lowercased command names of the peeled base, in order. */
  commandNames: string[];
  /** True when the query parsed without syntax errors. */
  parsed: boolean;
  /** True when the peeled base is an installable filter-only MATCH shape. */
  eligible: boolean;
}

const commandName = (cmd: ESQLCommand): string =>
  typeof cmd.name === 'string' ? cmd.name.toLowerCase() : '';

/**
 * Parse the query once, then peel any trailing run of SORT / LIMIT / KEEP by
 * slicing the *source* at the AST end offset of the last retained command.
 *
 * Slicing on AST locations (never a text regex) is what keeps a `|` inside a
 * string literal safe — e.g. `WHERE message == "queue full | LIMIT exceeded"`,
 * where a regex would cut mid-literal and produce an unterminated string.
 *
 * Cutting at the *end of what we keep* rather than the start of what we drop
 * also removes whatever sits between the two — the `|` separator plus any
 * comment. Slicing at the peeled command's start instead would leave a base
 * ending in `| <comment>`, whose dangling separator no cleanup can see.
 *
 * `Parser.parse` never throws on malformed input; it reports syntax errors in
 * an `errors` array. A query with errors must fail closed: compiling or
 * validating it would install a rule whose breach query fails on every run.
 */
function parseFilterOnly(esqlQuery: string): FilterOnlyParse {
  const trimmed = esqlQuery.trim();
  if (!trimmed) {
    return { base: '', commandNames: [], parsed: false, eligible: false };
  }

  const { root, errors } = Parser.parse(trimmed);
  if (errors.length > 0) {
    return { base: trimmed, commandNames: [], parsed: false, eligible: false };
  }

  const commands = root.commands as ESQLCommand[];

  let cut = commands.length;
  while (cut > 0 && TRAILING_COMMANDS.has(commandName(commands[cut - 1]))) {
    cut -= 1;
  }

  let base = trimmed;
  if (cut < commands.length) {
    // `location.max` is inclusive, hence the +1.
    base = cut === 0 ? '' : trimmed.slice(0, commands[cut - 1].location.max + 1).trimEnd();
  }

  const commandNames = commands.slice(0, cut).map(commandName);
  const eligible =
    commandNames.length > 0 &&
    commandNames[0] === 'from' &&
    commandNames.every((name) => ALLOWED_BASE_COMMANDS.has(name)) &&
    isReusableBase(base, cut);

  return { base, commandNames, parsed: true, eligible };
}

/**
 * Eligibility must imply compilability: callers append `| STATS …` to `base`,
 * and a base that no longer parses on its own — or that lost/gained a command
 * during the slice — would produce a breach query that fails on every rule run
 * while `canCompileMatchMetric` still reported true.
 */
function isReusableBase(base: string, expectedCommands: number): boolean {
  const { root, errors } = Parser.parse(base);
  return errors.length === 0 && (root.commands as ESQLCommand[]).length === expectedCommands;
}

/**
 * Returns true when a stored MATCH KI can be compiled into a count metric-series
 * breach query. Eligible shape, after peeling trailing SORT/LIMIT/KEEP: `FROM`
 * plus zero or more `WHERE` clauses — no mid-pipeline STATS, KEEP, SORT, LIMIT,
 * EVAL, etc. Unparseable queries are ineligible (fail closed).
 *
 * Ineligible queries must fail closed at install/promote — never fall back to
 * copying per-document rows into `.rule-events`.
 */
export function canCompileMatchMetric(esqlQuery: string): boolean {
  return parseFilterOnly(esqlQuery).eligible;
}

/**
 * Shared base builder for the compiler: parses once, enforces filter-only
 * eligibility, and returns the peeled base. Throws when the query is
 * ineligible or unparseable.
 */
export function buildMatchMetricBase(esqlQuery: string): string {
  const { base, eligible } = parseFilterOnly(esqlQuery);
  if (!eligible) {
    throw new Error(
      'MATCH query cannot be installed as a metric-series rule: expected a filter-only FROM … | WHERE … query (no STATS) that parses cleanly. Refusing to install a per-document copy rule.'
    );
  }
  return base;
}
