/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BasicPrettyPrinter,
  Builder,
  isBinaryExpression,
  Parser,
  walk,
  type WalkerAstNode,
} from '@elastic/esql';
import type {
  ESQLAstItem,
  ESQLAstQueryExpression,
  ESQLBinaryExpression,
  ESQLCommand,
  ESQLCommandOption,
  ESQLFunction,
  ESQLSingleAstItem,
  ESQLSource,
  ESQLStringLiteral,
} from '@elastic/esql/types';

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

type MetadataOption = ESQLCommandOption & { name: 'metadata' };

function isMetadataOption(arg: ESQLAstItem): arg is MetadataOption {
  return !Array.isArray(arg) && arg.type === 'option' && arg.name === 'metadata';
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

interface TimeBucketInfo {
  value: number;
  unit: string;
  targetField: string;
}

function findBucketFunction(commands: WalkerAstNode): ESQLFunction | null {
  let found: ESQLFunction | null = null;
  walk(commands, {
    visitFunction: (node, _ctx, walker) => {
      if (!found && (node.name === 'bucket' || node.name === 'tbucket')) {
        found = node;
        walker.abort();
      }
    },
  });
  return found;
}

function isTimeSpanLiteral(node: ESQLAstItem): node is ESQLSingleAstItem & {
  literalType: 'time_duration' | 'date_period';
  quantity: number;
  unit: string;
} {
  if (Array.isArray(node) || !('type' in node) || node.type !== 'literal') return false;
  const { literalType } = node as { literalType: string };
  return literalType === 'time_duration' || literalType === 'date_period';
}

function extractTimeBucketInfo(commands: WalkerAstNode): TimeBucketInfo | null {
  const bucketFn = findBucketFunction(commands);
  if (!bucketFn) return null;

  const targetArg = bucketFn.args[0];
  const targetField =
    targetArg && !Array.isArray(targetArg) && 'type' in targetArg && targetArg.type === 'column'
      ? (targetArg as { name: string }).name
      : null;

  const intervalArg = bucketFn.args[1];
  if (!intervalArg || Array.isArray(intervalArg)) return null;

  if (isTimeSpanLiteral(intervalArg)) {
    const { quantity, unit } = intervalArg;
    if (quantity > 0 && targetField) {
      return { value: quantity, unit, targetField };
    }
  }

  return null;
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

const UNMAPPED_FIELDS_DIRECTIVE = 'SET unmapped_fields="LOAD";\n';

/**
 * Prepends the `SET unmapped_fields="LOAD";` directive to an ES|QL query.
 * This tells ES|QL to load unmapped fields from `_source` as keyword
 * instead of raising "Unknown column" errors.
 */
export function withUnmappedFieldsDirective(query: string): string {
  return `${UNMAPPED_FIELDS_DIRECTIVE}${query}`;
}

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

  if (fromCmd.args.some(isMetadataOption)) return esql;

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

// ---------------------------------------------------------------------------
// Commutative normalization — sorts AND/OR operands so that
// `WHERE a AND b` and `WHERE b AND a` produce the same canonical string.
// ---------------------------------------------------------------------------

function printItem(item: ESQLAstItem): string {
  if (Array.isArray(item)) {
    return item.length === 1 ? printItem(item[0]) : item.map(printItem).join(', ');
  }
  return BasicPrettyPrinter.expression(item);
}

function isCommutativeOp(node: unknown): node is ESQLBinaryExpression<'and' | 'or'> {
  return isBinaryExpression(node) && (node.name === 'and' || node.name === 'or');
}

/**
 * Flattens a left-associative AND/OR chain into its leaf operands.
 * E.g. `AND(AND(a, b), c)` → `[a, b, c]`.
 */
function flattenCommutativeChain(
  node: ESQLBinaryExpression<'and' | 'or'>,
  opName: string
): ESQLAstItem[] {
  const operands: ESQLAstItem[] = [];
  for (const arg of node.args) {
    const item = Array.isArray(arg) ? arg[0] : arg;
    if (isCommutativeOp(item) && item.name === opName) {
      operands.push(...flattenCommutativeChain(item, opName));
    } else {
      operands.push(arg);
    }
  }
  return operands;
}

/**
 * Collects all binary-expression nodes in a commutative AND/OR tree
 * so they can be re-wired with sorted operands. Walks both children
 * to handle right-nested trees (e.g. `AND(a, AND(b, c))`) in addition
 * to the default left-associative parse trees.
 */
function collectChainSpine(
  node: ESQLBinaryExpression<'and' | 'or'>,
  opName: string
): ESQLBinaryExpression<'and' | 'or'>[] {
  const spine: ESQLBinaryExpression<'and' | 'or'>[] = [node];
  for (const arg of node.args) {
    const child = Array.isArray(arg) ? arg[0] : arg;
    if (isCommutativeOp(child) && child.name === opName) {
      spine.push(...collectChainSpine(child, opName));
    }
  }
  return spine;
}

/**
 * Sorts the operands of a commutative AND/OR chain in-place.
 * After sorting, the existing AST spine nodes are re-wired so that
 * `BasicPrettyPrinter.print` produces a deterministic operand order.
 */
function sortChainInPlace(node: ESQLBinaryExpression<'and' | 'or'>): void {
  const opName = node.name;
  const operands = flattenCommutativeChain(node, opName);
  if (operands.length <= 1) return;

  operands.sort((a, b) => {
    return printItem(a).localeCompare(printItem(b));
  });

  const spine = collectChainSpine(node, opName);
  // spine is [outermost, …, innermost]; reverse so index 0 is innermost
  spine.reverse();

  // Innermost node gets the first two operands
  spine[0].args = [operands[0], operands[1]];
  // Each subsequent node gets [previous spine node, next operand]
  for (let i = 1; i < spine.length; i++) {
    spine[i].args = [spine[i - 1], operands[i + 1]];
  }
}

/**
 * Bottom-up walk of an AST item: recurse into children first, then
 * sort commutative ops at the current level. This ensures inner
 * AND/OR expressions are canonicalized before being used as sort
 * keys for outer expressions.
 */
function sortCommutativeItem(item: ESQLAstItem): void {
  if (Array.isArray(item)) {
    item.forEach(sortCommutativeItem);
    return;
  }
  if ('args' in item && Array.isArray(item.args)) {
    item.args.forEach(sortCommutativeItem);
  }
  if (isCommutativeOp(item)) {
    sortChainInPlace(item);
  }
}

function sortCommutativeOps(root: ESQLAstQueryExpression): void {
  for (const cmd of root.commands) {
    cmd.args.forEach(sortCommutativeItem);
  }
}

/**
 * Like {@link normalizeEsqlQuery} but never throws and additionally
 * sorts commutative AND/OR operands so that `WHERE a AND b` and
 * `WHERE b AND a` produce the same canonical string. Falls back to
 * whitespace normalization when the parser cannot handle the input.
 */
export function normalizeEsqlSafe(esql: string): string {
  try {
    const { root } = Parser.parse(esql);
    sortCommutativeOps(root);
    return BasicPrettyPrinter.print(root);
  } catch {
    return esql.replace(/\s+/g, ' ').trim();
  }
}

/**
 * Returns `true` when two ES|QL query strings are semantically
 * equivalent after deep AST-based normalization (including
 * commutative AND/OR operand ordering).
 */
export function hasSameEsql(a: string, b: string): boolean {
  return normalizeEsqlSafe(a) === normalizeEsqlSafe(b);
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
 * Derives the canonical significant-events query type (`'match' | 'stats'`,
 * structurally equal to `QueryType` in `@kbn/significant-events-schema`) from an
 * ES|QL query string by checking whether it contains a STATS command.
 */
export function deriveQueryType(esql: string): 'match' | 'stats' {
  return hasStatsCommand(esql) ? 'stats' : 'match';
}

function collectFunctionNames(nodes: WalkerAstNode): Set<string> {
  const names = new Set<string>();
  walk(nodes, {
    visitFunction: (node) => {
      names.add(node.name);
    },
  });
  return names;
}

function hasRateComputation(nodes: WalkerAstNode): boolean {
  const fns = collectFunctionNames(nodes);
  return fns.has('*') && fns.has('/');
}

function containsFunction(node: WalkerAstNode, fnName: string): boolean {
  let found = false;
  walk(node, {
    visitFunction: (fn, _ctx, walker) => {
      if (fn.name === fnName) {
        found = true;
        walker.abort();
      }
    },
  });
  return found;
}

/**
 * For rate STATS (`*` + `/`), every COUNT in the STATS clause should carry a
 * per-aggregation WHERE. Accept any condition (`IS NOT NULL`, `IN (...)`,
 * equality) — the system prompt uses all three. Warn only when at least one
 * COUNT is bare (`total = COUNT(*)` with no WHERE).
 */
function checkFilteredDenominator(
  statsCmd: ESQLCommand,
  commandsFromStats: ESQLCommand[],
  hints: string[]
): void {
  if (!hasRateComputation(commandsFromStats)) return;

  let hasCount = false;
  let hasUnfilteredCount = false;

  for (const arg of statsCmd.args) {
    if (Array.isArray(arg) || arg.type === 'option') continue;
    if (arg.type !== 'function') continue;

    // `alias = COUNT(*) WHERE <condition>` — any condition counts as filtered.
    if (arg.name === 'where' && arg.subtype === 'binary-expression') {
      const [aggSide] = arg.args;
      if (aggSide && !Array.isArray(aggSide) && containsFunction(aggSide, 'count')) {
        hasCount = true;
      }
      continue;
    }

    // Bare `alias = COUNT(*)` (or unaliased COUNT) — unfiltered denominator risk.
    if ((arg.name === '=' || arg.name === 'count') && containsFunction(arg, 'count')) {
      hasCount = true;
      hasUnfilteredCount = true;
    }
  }

  if (!hasCount || !hasUnfilteredCount) return;

  hints.push(
    'Note: The denominator appears to use unfiltered COUNT(*). In mixed streams, filter it with WHERE <field> IS NOT NULL, IN (...), or an equality so rows without the target field are excluded.'
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
  const statsCmd = commands[statsIdx];
  const commandsFromStats = commands.slice(statsIdx);

  if (!extractTimeBucketInfo(commands)) {
    hints.push(
      'Note: This STATS query has no temporal bucketing. Each execution produces one value per group. Consider adding BY bucket = BUCKET(@timestamp, N minutes) for time-series granularity.'
    );
  }

  const commandsAfterStats = commands.slice(statsIdx + 1);
  const hasWhereAfterStats = commandsAfterStats.some((cmd) => cmd.name === 'where');

  // Metric-series contract: continuous series ending in metric_value + bucket.
  // Do not require breach-threshold WHERE after STATS (change_point replaces thresholds).
  const bucketColumn = extractBucketColumnName(esql);
  if (bucketColumn && bucketColumn !== 'bucket') {
    hints.push(
      'Warning: Temporal bucket column must be named exactly `bucket` (e.g. BY bucket = BUCKET(@timestamp, 1 minute)).'
    );
  }

  const bucketIntervalMs = extractBucketIntervalMs(esql);
  if (bucketIntervalMs != null && bucketIntervalMs !== MS_PER_UNIT.minute) {
    hints.push(
      'Warning: Use a 1-minute temporal bucket: BY bucket = BUCKET(@timestamp, 1 minute).'
    );
  }

  if (!/\bmetric_value\b/.test(esql)) {
    hints.push(
      'Warning: STATS queries must emit a final column named exactly `metric_value` (use EVAL … AS metric_value or name the aggregate metric_value). End with | KEEP bucket, metric_value.'
    );
  }

  if (hasWhereAfterStats) {
    hints.push(
      'Warning: Avoid WHERE after STATS that drops buckets (thresholds or sample-size floors). Emit a point for every bucket; use CASE for safe rates (e.g. CASE(total > 0, errors * 100.0 / total, 0)).'
    );
  }

  checkFilteredDenominator(statsCmd, commandsFromStats, hints);

  const byArgs = findStatsByArgs(esql);
  if (byArgs) {
    const nonBucketByColumns = byArgs.filter((arg) => {
      const fnName = getAssignmentRhsFnName(arg);
      return fnName !== 'bucket' && fnName !== 'tbucket';
    });
    if (nonBucketByColumns.length > 0) {
      hints.push(
        `Warning: ${nonBucketByColumns.length} non-temporal GROUP BY dimension(s) detected. v0 metric series supports time bucket only — remove entity BY columns (e.g. service.name).`
      );
    }
  }

  const disallowed = ['sort', 'limit'];
  const found = commandsAfterStats
    .filter((cmd) => disallowed.includes(cmd.name))
    .map((cmd) => cmd.name.toUpperCase());
  if (found.length > 0) {
    hints.push(
      `Warning: ${found.join(
        ', '
      )} after STATS should not be used. Prefer | KEEP bucket, metric_value as the final step.`
    );
  }

  return hints;
}

export interface OverBroadMatchPredicate {
  field: string;
  value: string;
  operator: ':' | 'MATCH';
}

function isKeywordLiteral(node: ESQLAstItem | undefined): node is ESQLStringLiteral {
  return (
    !!node &&
    !Array.isArray(node) &&
    'type' in node &&
    node.type === 'literal' &&
    node.literalType === 'keyword'
  );
}

function getUnquotedLiteral(node: ESQLAstItem | undefined): string | null {
  return isKeywordLiteral(node) ? node.valueUnquoted : null;
}

function matchOptionsForceAndOperator(node: ESQLAstItem | undefined): boolean {
  if (!node || Array.isArray(node) || !('type' in node) || node.type !== 'map') return false;
  return node.entries.some(
    (entry) =>
      getUnquotedLiteral(entry.key)?.toLowerCase() === 'operator' &&
      getUnquotedLiteral(entry.value)?.toLowerCase() === 'and'
  );
}

function getColumnName(node: ESQLAstItem | undefined): string {
  if (!node || Array.isArray(node)) return '<field>';
  return BasicPrettyPrinter.expression(node as ESQLSingleAstItem);
}

/**
 * Finds multi-word `:` / `MATCH` predicates - ORed term-by-term on text, an over-match.
 * Mapping-blind on purpose: a field's type is ambiguous across backing indices, and the fix
 * `MATCH_PHRASE` is safe either way.
 */
export function findOverBroadMatchPredicates(esql: string): OverBroadMatchPredicate[] {
  const { root, parsed } = tryParseEsql(esql);
  if (!parsed) return [];

  const issues: OverBroadMatchPredicate[] = [];
  walk(root, {
    visitFunction: (fn) => {
      const isColon = fn.name === ':' && fn.subtype === 'binary-expression';
      const isMatch = fn.name === 'match' && fn.subtype === 'variadic-call';
      if (!isColon && !isMatch) return;

      const value = getUnquotedLiteral(fn.args[1]);
      if (value === null) return;
      if (isMatch && matchOptionsForceAndOperator(fn.args[2])) return;
      if (!/\s/.test(value.trim())) return;

      issues.push({ field: getColumnName(fn.args[0]), value, operator: isColon ? ':' : 'MATCH' });
    },
  });
  return issues;
}

/**
 * Every column identifier in the query (field references, output aliases, and `*`),
 * de-duplicated; empty when it does not parse.
 */
export function extractReferencedColumns(esql: string): string[] {
  const { root, parsed } = tryParseEsql(esql);
  if (!parsed) return [];

  const names = new Set<string>();
  walk(root, { visitColumn: (node) => names.add(node.name) });
  return [...names];
}

/** Shared rejection message for {@link findOverBroadMatchPredicates} results, so callers stay identical. */
export function renderOverBroadMatchError(predicates: OverBroadMatchPredicate[]): string {
  const rendered = predicates
    .map((p) =>
      p.operator === ':' ? `${p.field} : "${p.value}"` : `MATCH(${p.field}, "${p.value}")`
    )
    .join(', ');
  return (
    `Full-text predicate(s) match ANY word rather than the whole value - a multi-word ":" or ` +
    `MATCH value is ORed term-by-term, which is far too broad: ${rendered}. Replace each with ` +
    `MATCH_PHRASE(field, "a b") for an exact phrase, or MATCH(field, "a b", {"operator": "AND"}) ` +
    `to require all terms in any order; both match exactly on keyword fields.`
  );
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
  const rawRhs = (arg as { args: ESQLCommand['args'] }).args[1];
  // The AST wraps some RHS expressions in a single-element array
  const rhs = Array.isArray(rawRhs) ? rawRhs[0] : rawRhs;
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
 * in the STATS command's BY clause.
 *
 * Returns `null` when no bucket call is found or the query fails to parse.
 */
export function extractBucketColumnName(esql: string): string | null {
  const byArgs = findStatsByArgs(esql);
  if (!byArgs) return null;

  for (const arg of byArgs) {
    const fnName = getAssignmentRhsFnName(arg);
    if (fnName === 'bucket' || fnName === 'tbucket') {
      return getAssignmentLhsName(arg);
    }
  }
  return null;
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
 * Returns `null` when no temporal bucketing is found or the query fails to parse.
 */
export function extractBucketTargetField(esql: string): string | null {
  const { root, parsed } = tryParseEsql(esql);
  if (!parsed) return null;

  const bucketFn = findBucketFunction(root.commands);
  if (!bucketFn) return null;

  const targetArg = bucketFn.args[0];
  if (!targetArg || Array.isArray(targetArg)) return null;

  if ('type' in targetArg && targetArg.type === 'column' && 'name' in targetArg) {
    return (targetArg as { name: string }).name;
  }
  return null;
}

/**
 * Extracts the temporal bucket interval from a STATS query's
 * `BUCKET(@timestamp, N unit)` or `TBUCKET(@timestamp, N unit)` call
 * and returns the interval in milliseconds.
 *
 * Returns `null` when no temporal bucketing is found.
 */
export function extractBucketIntervalMs(esql: string): number | null {
  const { root, parsed } = tryParseEsql(esql);
  if (!parsed) return null;

  const info = extractTimeBucketInfo(root.commands);
  if (!info) return null;

  const msPerUnit = MS_PER_UNIT[info.unit];
  if (!msPerUnit) return null;

  return info.value * msPerUnit;
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
