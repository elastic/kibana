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
      Builder.expression.column({ args: [Builder.identifier('_source')] }),
    ],
  });
}

/**
 * Parses the given ES|QL query string and returns the first argument of
 * the WHERE command as an AST node, or `undefined` when no WHERE clause
 * is present (or the argument is an unexpected array).
 */
export function extractWhereExpression(esql: string): ESQLSingleAstItem | undefined {
  const { root } = Parser.parse(esql);
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
 */
export function hasStatsCommand(esql: string): boolean {
  try {
    const { root } = Parser.parse(esql);
    return root.commands.some((cmd) => 'name' in cmd && cmd.name === 'stats');
  } catch {
    // AST parse failed -- fall back to regex to avoid silently misclassifying
    // a STATS query as match (which would skip threshold logic entirely).
    return /\|\s*STATS\s/i.test(esql);
  }
}

/**
 * Derives the canonical {@link QueryType} from an ES|QL query string
 * by checking whether it contains a STATS command.
 */
export function deriveQueryType(esql: string): QueryType {
  return hasStatsCommand(esql) ? 'stats' : 'match';
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
  try {
    const { root } = Parser.parse(esql);
    const commands = root.commands.filter(
      (cmd): cmd is ESQLCommand => 'name' in cmd
    );
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

    // These commands are disallowed in STATS queries. The check is placed on the
    // stats branch; the system prompt independently blocks them for match queries.
    const disallowed = ['sort', 'limit', 'keep'];
    const found = commands.filter((cmd) => disallowed.includes(cmd.name)).map((cmd) => cmd.name.toUpperCase());
    if (found.length > 0) {
      hints.push(
        `Warning: ${found.join(', ')} should not be used in STATS queries. The system manages ordering and limits.`
      );
    }

    return hints;
  } catch {
    return [];
  }
}

/**
 * Extracts the output column names from the STATS command's BY clause.
 * Used to identify group-by dimensions for alert identity hashing,
 * avoiding the fragile numeric-type heuristic.
 *
 * Returns column names in sorted order for deterministic hashing.
 * Returns an empty array when no STATS or BY clause is found, or on parse failure.
 */
export function extractStatsGroupColumns(esql: string): string[] {
  try {
    const { root } = Parser.parse(esql);
    const statsCmd = root.commands.find(
      (cmd): cmd is ESQLCommand => 'name' in cmd && cmd.name === 'stats'
    );
    if (!statsCmd) return [];

    const byOption = statsCmd.args.find(
      (arg) => !Array.isArray(arg) && 'type' in arg && arg.type === 'option' && 'name' in arg && arg.name === 'by'
    );
    if (!byOption || Array.isArray(byOption) || !('args' in byOption)) return [];

    const names: string[] = [];
    for (const arg of (byOption as { args: ESQLCommand['args'] }).args) {
      if (Array.isArray(arg)) continue;
      if (!('type' in arg)) continue;

      if (arg.type === 'column' && 'name' in arg) {
        names.push(arg.name as string);
      } else if (arg.type === 'function' && 'name' in arg && arg.name === '=') {
        const lhs = (arg as { args: ESQLCommand['args'] }).args[0];
        if (lhs && !Array.isArray(lhs) && 'type' in lhs && lhs.type === 'column' && 'name' in lhs) {
          names.push(lhs.name as string);
        }
      }
    }

    return names.sort();
  } catch {
    return [];
  }
}

/**
 * Extracts the output column name for the temporal BUCKET/TBUCKET call
 * in the STATS command's BY clause. Returns `null` when no aliased
 * bucket call is found, signaling the caller to fall back to type-based
 * column detection.
 */
export function extractBucketColumnName(esql: string): string | null {
  try {
    const { root } = Parser.parse(esql);
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

    for (const arg of (byOption as { args: ESQLCommand['args'] }).args) {
      if (Array.isArray(arg)) continue;
      if (!('type' in arg)) continue;

      if (arg.type === 'function' && 'name' in arg && arg.name === '=') {
        const rhs = (arg as { args: ESQLCommand['args'] }).args[1];
        if (
          rhs &&
          !Array.isArray(rhs) &&
          'type' in rhs &&
          rhs.type === 'function' &&
          'name' in rhs
        ) {
          const fnName = (rhs.name as string).toLowerCase();
          if (fnName === 'bucket' || fnName === 'tbucket') {
            const lhs = (arg as { args: ESQLCommand['args'] }).args[0];
            if (
              lhs &&
              !Array.isArray(lhs) &&
              'type' in lhs &&
              lhs.type === 'column' &&
              'name' in lhs
            ) {
              return lhs.name as string;
            }
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

const MS_PER_UNIT: Record<string, number> = {
  s: 1_000,
  second: 1_000,
  seconds: 1_000,
  m: 60_000,
  minute: 60_000,
  minutes: 60_000,
  h: 3_600_000,
  hour: 3_600_000,
  hours: 3_600_000,
  d: 86_400_000,
  day: 86_400_000,
  days: 86_400_000,
};

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
