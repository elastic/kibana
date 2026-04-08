/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder, Parser } from '@elastic/esql';
import type { ESQLCommand, ESQLSingleAstItem, ESQLSource } from '@elastic/esql/types';
import type { QueryType } from '../queries';

// ---------------------------------------------------------------------------
// Internal helpers — shared parsing, type-guarding, and printing logic
// ---------------------------------------------------------------------------

function parseFromCommand(esql: string) {
  const { root } = Parser.parse(esql);
  const fromCmd = root.commands.find(
    (cmd): cmd is ESQLCommand => 'name' in cmd && cmd.name === 'from'
  );
  return { root, fromCmd };
}

function isIndexSource(arg: ESQLCommand['args'][number]): arg is ESQLSource {
  return (
    !Array.isArray(arg) &&
    'type' in arg &&
    arg.type === 'source' &&
    (arg as ESQLSource).sourceType === 'index'
  );
}

function printWithUpdatedFrom(
  root: ReturnType<typeof parseFromCommand>['root'],
  fromCmd: ESQLCommand,
  newArgs: ESQLCommand['args']
): string {
  const updatedCommands = root.commands.map((cmd) =>
    cmd === fromCmd ? { ...cmd, args: newArgs } : cmd
  );
  return BasicPrettyPrinter.print(Builder.expression.query(updatedCommands as ESQLCommand[]));
}

/**
 * Matches `BUCKET(@timestamp, N unit)` or `TBUCKET(@timestamp, N unit)` in
 * the raw query string. The AST does not expose BUCKET as a named node in a
 * way that's easy to match, so regex is the pragmatic approach.
 *
 * When the match succeeds, group 1 is the numeric value and group 2 is the
 * time unit (e.g. "5", "minutes"). Returns `null` when no bucket call is found.
 */
function matchTimeBucket(esql: string): RegExpMatchArray | null {
  return esql.match(
    /(?:BUCKET|TBUCKET)\s*\(\s*[\w@.]+\s*,\s*(\d+)\s*(seconds?|minutes?|hours?|days?|[smhd])\s*\)/i
  );
}

const STATS_REGEX = /\|\s*STATS\b/i;

function tryParseEsql(esql: string) {
  try {
    return { root: Parser.parse(esql).root, parsed: true as const };
  } catch {
    return { root: null, parsed: false as const };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds the ES|QL AST node for `METADATA _id, _source`.
 * Shared across all locations that construct or augment FROM commands.
 */
export function buildMetadataOption() {
  return Builder.option({
    name: 'METADATA',
    args: [
      Builder.expression.column({ args: [Builder.identifier({ name: '_id' })] }),
      Builder.expression.column({ args: [Builder.identifier({ name: '_source' })] }),
    ],
  });
}

/**
 * Parses the given ES|QL query string and returns the first argument of
 * the WHERE command as an AST node, or `undefined` when no WHERE clause
 * is present (or the argument is an unexpected array).
 */
export function extractWhereExpression(esql: string): ESQLSingleAstItem | undefined {
  const { root, parsed } = tryParseEsql(esql);
  if (!parsed) return undefined;
  const whereCmd = root.commands.find(
    (cmd): cmd is ESQLCommand => 'name' in cmd && cmd.name === 'where'
  );
  const expr = whereCmd?.args[0];
  if (!expr || Array.isArray(expr)) return undefined;
  return expr as ESQLSingleAstItem;
}

/**
 * Ensures the ES|QL query contains `METADATA _id, _source` in its FROM
 * clause. Returns the query unchanged if METADATA is already present.
 */
export function ensureMetadata(esql: string): string {
  const { root, fromCmd } = parseFromCommand(esql);
  if (!fromCmd) return esql;

  const hasMetadata = fromCmd.args.some(
    (arg) =>
      !Array.isArray(arg) &&
      'type' in arg &&
      arg.type === 'option' &&
      'name' in arg &&
      arg.name === 'metadata'
  );

  if (hasMetadata) return esql;

  return printWithUpdatedFrom(root, fromCmd, [...fromCmd.args, buildMetadataOption()]);
}

/**
 * Normalizes an ES|QL query string by parsing it into an AST and
 * pretty-printing it back. This strips comments, collapses whitespace,
 * and uppercases command/keyword names so that two syntactically
 * equivalent queries produce the same string.
 */
export function normalizeEsqlQuery(esql: string): string {
  const { root } = Parser.parse(esql);
  return BasicPrettyPrinter.print(root);
}

/**
 * Returns the list of index source names from the FROM clause of an
 * ES|QL query. Returns an empty array when there is no FROM clause.
 */
export function getFromSources(esql: string): string[] {
  const { fromCmd } = parseFromCommand(esql);
  if (!fromCmd) return [];
  return fromCmd.args.filter(isIndexSource).map((source) => source.name);
}

/**
 * Replaces all index sources in the FROM clause with `newSources`,
 * preserving any non-source arguments (e.g. METADATA options).
 * Returns the query unchanged when there is no FROM clause.
 */
export function replaceFromSources(esql: string, newSources: string[]): string {
  const { root, fromCmd } = parseFromCommand(esql);
  if (!fromCmd) return esql;

  const nonSourceArgs = fromCmd.args.filter((arg) => !isIndexSource(arg));
  const sourceArgs = newSources.map((s) => Builder.expression.source.index(s));
  return printWithUpdatedFrom(root, fromCmd, [...sourceArgs, ...nonSourceArgs]);
}

/**
 * Returns `true` when the ES|QL query contains a STATS command,
 * indicating an aggregation-based (symptom) query rather than a
 * row-level (cause / match) query.
 *
 * When parsing succeeds the AST is inspected for a `stats` command.
 * On parse failure a regex fallback (`STATS_REGEX`) is used so that
 * unparseable queries containing `| STATS` are still classified
 * correctly rather than silently defaulting to `match`.
 *
 * **Limitation**: the regex fallback can misclassify if `| STATS`
 * appears inside a string literal or comment. Callers in validation
 * paths (e.g. {@link validateEsqlQueryForStreamOrThrow}) should
 * parse independently so a parse failure surfaces before classification.
 */
export function hasStatsCommand(esql: string): boolean {
  const { root, parsed } = tryParseEsql(esql);
  if (!parsed) return STATS_REGEX.test(esql);
  return root.commands.some((cmd) => 'name' in cmd && cmd.name === 'stats');
}

/**
 * Derives the canonical {@link QueryType} from an ES|QL query string
 * by checking whether it contains a STATS command.
 */
export function deriveQueryType(esql: string): QueryType {
  return hasStatsCommand(esql) ? 'stats' : 'match';
}

// Detects `<var> * <number> / <var>` — a rate computation — regardless of variable names.
const RATE_PATTERN = /\b\w+\s*\*\s*[\d.]+\s*\/\s*\w+\b/i;

// Rate computations and statistical aggregations that require a minimum
// sample size to produce meaningful results. Simple COUNT thresholds are
// excluded because the count itself acts as the sample size.
const STAT_AGG_PATTERN =
  /\bPERCENTILE\b|\bPERCENTILE_DISC\b|\bPERCENTILE_CONT\b|\bAVG\b|\bMEDIAN\b/i;
const NEEDS_SAMPLE_FLOOR_PATTERN = new RegExp(
  `${RATE_PATTERN.source}|${STAT_AGG_PATTERN.source}`,
  'i'
);

const COMPARISON_PATTERN = /\b\w+\s*[<>]=?\s*\d+(?:\.\d+)?/gi;

function checkSampleSizeFloor(esql: string, hints: string[]): void {
  if (!NEEDS_SAMPLE_FLOOR_PATTERN.test(esql)) return;

  // Find all pipe-delimited WHERE commands (the post-STATS thresholds),
  // not inner WHERE clauses inside a STATS aggregation like `COUNT(*) WHERE …`.
  // The threshold may be split across multiple WHERE clauses
  // (e.g. `| WHERE total > 20 | WHERE rate > 5`), so we aggregate
  // comparisons across all of them.
  const pipeWhereMatch = esql.match(/\|\s*WHERE\b((?:(?!\|).)*)/gis);
  if (!pipeWhereMatch) return;

  const allWhereBodies = pipeWhereMatch.map((m) => m.replace(/^\|\s*WHERE\b/i, '')).join(' ');

  // A threshold clause needs at least two comparisons: one for the volume
  // floor (e.g. total > 20) and one for the metric threshold (e.g.
  // error_rate > 10). A single comparison is likely just the threshold
  // without a floor.
  const matches = allWhereBodies.match(COMPARISON_PATTERN);
  if (!matches || matches.length < 2) {
    hints.push(
      'Heuristic warning: This STATS query may lack a sample-size floor (e.g. total > 20). Low-traffic buckets can produce high-variance results that trigger false alerts. This check is approximate — compound predicates may not be detected.'
    );
  }
}

function checkIsNotNullDenominator(esql: string, hints: string[]): void {
  if (!RATE_PATTERN.test(esql)) return;

  // Extract the STATS command body (from `| STATS` to the next `|`).
  const statsMatch = esql.match(/\|\s*STATS\b([\s\S]*?)(?:\|(?!\s*STATS\b)|$)/i);
  const statsBody = statsMatch?.[1] ?? '';

  // A well-formed rate denominator uses `COUNT(*) WHERE <field> IS NOT NULL`
  // to exclude rows missing the target field in mixed streams. If no arm
  // in the STATS body contains this pattern, warn.
  const hasFilteredDenominator = /COUNT\s*\(\s*\*\s*\)\s*WHERE\b[^,]*\bIS\s+NOT\s+NULL\b/i.test(
    statsBody
  );

  if (hasFilteredDenominator) return;

  hints.push(
    'Note: The denominator appears to use unfiltered COUNT(*). In mixed streams, consider filtering with WHERE <field> IS NOT NULL to exclude rows without the target field.'
  );
}

/**
 * Returns quality hints for STATS queries to feed back to the LLM.
 * Checks for common structural issues in aggregate queries.
 * Returns an empty array for non-STATS queries or when no issues are found.
 *
 * Note: This re-parses the ES|QL string (same as {@link hasStatsCommand}).
 * The double parse is intentional — callers may invoke only one of the two
 * functions, and merging them would couple unrelated responsibilities.
 */
export function getStatsQueryHints(esql: string): string[] {
  const { root, parsed } = tryParseEsql(esql);

  if (!parsed) {
    if (STATS_REGEX.test(esql)) {
      return [
        'Warning: Query could not be fully parsed; structural checks were skipped. Verify STATS syntax manually.',
      ];
    }
    return [];
  }

  const commands = root.commands.filter((cmd): cmd is ESQLCommand => 'name' in cmd);
  const isStats = commands.some((cmd) => cmd.name === 'stats');

  if (!isStats) {
    const hints: string[] = [];
    if (commands.some((cmd) => cmd.name === 'eval')) {
      hints.push(
        'Warning: EVAL is supported only in stats-type queries. Remove the EVAL command or convert to a STATS query.'
      );
    }
    return hints;
  }

  const hints: string[] = [];
  const statsIdx = commands.findIndex((cmd) => cmd.name === 'stats');

  if (!matchTimeBucket(esql)) {
    hints.push(
      'Note: This STATS query has no temporal bucketing. Each execution produces one value per group. Consider adding BY bucket = BUCKET(@timestamp, N minutes) for time-series granularity.'
    );
  }

  const commandsAfterStats = commands.slice(statsIdx + 1);
  const hasWhereAfterStats = commandsAfterStats.some((cmd) => cmd.name === 'where');
  if (!hasWhereAfterStats) {
    hints.push(
      'Warning: No threshold filter after STATS. For alerting, add | WHERE <metric> > <threshold> to distinguish normal from anomalous conditions.'
    );
  }

  if (hasWhereAfterStats) {
    checkSampleSizeFloor(esql, hints);
  }

  checkIsNotNullDenominator(esql, hints);

  const disallowed = ['sort', 'limit', 'keep'];
  const found = commandsAfterStats
    .filter((cmd) => disallowed.includes(cmd.name))
    .map((cmd) => cmd.name.toUpperCase());
  if (found.length > 0) {
    hints.push(
      `Warning: ${found.join(
        ', '
      )} after STATS should not be used. The system manages ordering and limits.`
    );
  }

  return hints;
}

type ByArg = ESQLCommand['args'][number];

function findStatsByArgs(esql: string): ByArg[] | null {
  const { root, parsed } = tryParseEsql(esql);
  if (!parsed) return null;

  const statsCmd = root.commands.find(
    (cmd): cmd is ESQLCommand => 'name' in cmd && cmd.name === 'stats'
  );
  if (!statsCmd) return null;

  const byOption = statsCmd.args.find(
    (arg) =>
      !Array.isArray(arg) &&
      'type' in arg &&
      arg.type === 'option' &&
      'name' in arg &&
      arg.name === 'by'
  );
  if (!byOption || Array.isArray(byOption) || !('args' in byOption)) return null;

  return (byOption as { args: ESQLCommand['args'] }).args;
}

function getAssignmentLhsName(arg: ByArg): string | null {
  if (Array.isArray(arg) || !('type' in arg)) return null;
  if (arg.type === 'column' && 'name' in arg) return arg.name as string;
  if (arg.type === 'function' && 'name' in arg && arg.name === '=') {
    const lhs = (arg as { args: ESQLCommand['args'] }).args[0];
    if (lhs && !Array.isArray(lhs) && 'type' in lhs && lhs.type === 'column' && 'name' in lhs) {
      return lhs.name as string;
    }
  }
  return null;
}

function getAssignmentRhsFnName(arg: ByArg): string | null {
  if (Array.isArray(arg) || !('type' in arg)) return null;
  if (arg.type !== 'function' || !('name' in arg) || arg.name !== '=') return null;
  const rhs = (arg as { args: ESQLCommand['args'] }).args[1];
  if (rhs && !Array.isArray(rhs) && 'type' in rhs && rhs.type === 'function' && 'name' in rhs) {
    return (rhs.name as string).toLowerCase();
  }
  return null;
}

/**
 * Extracts the output column names from the STATS command's BY clause.
 * Used to identify group-by dimensions for preview multi-group detection
 * and potential future alert identity hashing.
 *
 * Returns column names in sorted order for deterministic comparison.
 * Returns an empty array when no STATS or BY clause is found, or on parse failure.
 */
export function extractStatsGroupColumns(esql: string): string[] {
  const byArgs = findStatsByArgs(esql);
  if (!byArgs) return [];

  const names: string[] = [];
  for (const arg of byArgs) {
    const name = getAssignmentLhsName(arg);
    if (name) names.push(name);
  }
  return names.sort();
}

/**
 * Extracts the output column name for the temporal BUCKET/TBUCKET call
 * in the STATS command's BY clause. Falls back to regex when the AST
 * doesn't expose the alias (known parser limitation with some BUCKET forms).
 *
 * Returns `null` when no bucket call is found.
 */
export function extractBucketColumnName(esql: string): string | null {
  const byArgs = findStatsByArgs(esql);
  if (byArgs) {
    for (const arg of byArgs) {
      const fnName = getAssignmentRhsFnName(arg);
      if (fnName === 'bucket' || fnName === 'tbucket') {
        const name = getAssignmentLhsName(arg);
        if (name) return name;
      }
    }
  }

  // Regex fallback for cases where the AST doesn't expose the alias.
  // Supports dotted identifiers (e.g. `foo.bar = BUCKET(...)`).
  const match = esql.match(/([\w.]+)\s*=\s*(?:BUCKET|TBUCKET)\s*\(/i);
  return match?.[1] ?? null;
}

const ONE_SECOND_IN_MS = 1_000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;
const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;

export const MS_PER_UNIT: Record<string, number> = {
  s: ONE_SECOND_IN_MS,
  second: ONE_SECOND_IN_MS,
  seconds: ONE_SECOND_IN_MS,
  m: ONE_MINUTE_IN_MS,
  minute: ONE_MINUTE_IN_MS,
  minutes: ONE_MINUTE_IN_MS,
  h: ONE_HOUR_IN_MS,
  hour: ONE_HOUR_IN_MS,
  hours: ONE_HOUR_IN_MS,
  d: ONE_DAY_IN_MS,
  day: ONE_DAY_IN_MS,
  days: ONE_DAY_IN_MS,
};

/**
 * Extracts the source field passed as the first argument to BUCKET/TBUCKET
 * (e.g. `@timestamp` in `BUCKET(@timestamp, 5 minutes)`).
 *
 * Returns `null` when no temporal bucketing is found.
 */
export function extractBucketTargetField(esql: string): string | null {
  const match = esql.match(/(?:BUCKET|TBUCKET)\s*\(\s*([\w@.]+)\s*,/i);
  return match?.[1] ?? null;
}

/**
 * Extracts the temporal bucket interval from a STATS query's
 * `BUCKET(@timestamp, N unit)` or `TBUCKET(@timestamp, N unit)` call
 * and returns the interval in milliseconds.
 *
 * Returns `null` when no temporal bucketing is found.
 */
export function extractBucketIntervalMs(esql: string): number | null {
  const match = matchTimeBucket(esql);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const msPerUnit = MS_PER_UNIT[unit];

  if (!msPerUnit || isNaN(value) || value <= 0) return null;

  return value * msPerUnit;
}

/**
 * Rewrites the index sources in the FROM clause of an ES|QL query.
 * Each index source name is passed through `transform`; if the
 * returned value differs the source is replaced. Returns the original
 * string unchanged when there is no FROM clause or no source was
 * modified.
 */
export function rewriteFromSources(esql: string, transform: (index: string) => string): string {
  const { root, fromCmd } = parseFromCommand(esql);
  if (!fromCmd) return esql;

  let modified = false;
  const updatedArgs = fromCmd.args.map((arg) => {
    if (isIndexSource(arg)) {
      const newIndex = transform(arg.name);
      if (newIndex !== arg.name) {
        modified = true;
        return Builder.expression.source.index(newIndex);
      }
    }
    return arg;
  });

  if (!modified) return esql;

  return printWithUpdatedFrom(root, fromCmd, updatedArgs);
}
