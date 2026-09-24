/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ESQLAstCommand,
  ESQLAstItem,
  ESQLAstQueryExpression,
  ESQLCommand,
  ESQLFunction,
} from '@elastic/esql/types';
import {
  BasicPrettyPrinter,
  Builder,
  Parser,
  isColumn,
  isFunctionExpression,
  mutate,
} from '@elastic/esql';

/**
 * Source-document metadata columns that identify a rule event for
 * deduplication. They match the inputs the detection engine's ES|QL rule type
 * hashes (`_id`, `_version`, `_index`) so both engines agree on what "the same
 * source document" means.
 *
 * `resolveRuleEventId` in `build_alert_events.ts` reads these columns back out
 * of each row to build the deterministic `.rule-events` `_id`.
 */
export const DEDUPLICATION_METADATA_FIELDS = ['_id', '_index', '_version'] as const;

/**
 * Whether the query aggregates its rows with `STATS`. Aggregated rows are not
 * source documents, so there is no document identity to deduplicate on and
 * the query is left untouched.
 */
const isAggregating = (root: ESQLAstQueryExpression): boolean =>
  root.commands.some((command) => command.name === 'stats');

/**
 * Rewrites a non-aggregating rule query so every result row carries the
 * source-document identity used for deduplication.
 *
 * Called by `ExecuteRuleQueryStep` on the breach query before the row limit
 * is appended and the query is executed. The stored rule is never modified;
 * the transform is applied per run, in memory.
 *
 * - `FROM … METADATA _id, _index, _version` is upserted, so fields the author
 *   already declared are kept and only missing ones are appended.
 * - Each field is appended to any `KEEP` that would otherwise project it
 *   away; see {@link addFieldToKeepCommands} for the stop conditions.
 * - Aggregating queries (any `STATS`) are returned byte-for-byte unchanged.
 * - Queries without a `FROM` (`ROW`, `TS`) have nothing to upsert into and
 *   come back unchanged apart from pretty-printing.
 *
 * Throws only if `@elastic/esql` fails while mutating or printing the AST
 * (the parser itself is error-tolerant). The caller catches that, logs
 * `RULE_EXECUTION_DEDUP_METADATA_INJECTION_FAILED`, and runs the original
 * query, so a failure here degrades to "no deduplication for this run"
 * rather than a failed rule execution.
 */
export const injectDeduplicationMetadata = (query: string): string => {
  const { root } = Parser.parse(query);

  if (isAggregating(root)) {
    return query;
  }

  DEDUPLICATION_METADATA_FIELDS.forEach((field) => {
    mutate.commands.from.metadata.upsert(root, field);
    addFieldToKeepCommands(root, field);
  });

  return BasicPrettyPrinter.print(root);
};

/**
 * Keeps an injected metadata column from being projected away by the
 * author's own `KEEP` commands.
 *
 * `METADATA` only makes the column available; a later `KEEP host.name` would
 * drop it and the row would reach the executor without an `_id`, silently
 * disabling deduplication for that rule. To prevent that, `field` is appended
 * to every `KEEP` in the pipeline that does not already list it.
 *
 * Injection stops at the first command after which the column no longer
 * means "the source document's metadata": a `DROP` of the field or of any
 * wildcard, a `RENAME field AS …`, or an `EVAL field = …`. A `KEEP` past that
 * point is left alone, which is the same conservative behaviour as the
 * detection engine's `injectMetadataId`. An author who explicitly removes the
 * field therefore opts that rule out of deduplication; nothing fails.
 *
 * Mutates `root` in place. Has no effect when the pipeline has no `KEEP`.
 */
function addFieldToKeepCommands(root: ESQLAstQueryExpression, field: string): void {
  const stopIndex = root.commands.findIndex((command) => invalidatesField(command, field));
  const reachable = stopIndex === -1 ? root.commands : root.commands.slice(0, stopIndex);

  reachable
    .filter(isKeepCommand)
    .filter((command) => !listsColumn(command.args, field))
    .forEach((command) => command.args.push(Builder.expression.column(field)));
}

/** Narrows the command union to `KEEP`, whose `args` are plain column items. */
const isKeepCommand = (command: ESQLAstCommand): command is ESQLCommand<'keep'> =>
  command.name === 'keep';

/**
 * Whether `command` changes what `field` refers to for everything after it,
 * ending KEEP injection. See {@link addFieldToKeepCommands}.
 */
const invalidatesField = (command: ESQLAstCommand, field: string): boolean =>
  (command.name === 'drop' && hasColumnMatching(command.args, field)) ||
  (command.name === 'rename' && hasRenameOf(command.args, field)) ||
  (command.name === 'eval' && hasAssignmentTo(command.args, field));

/** Whether the argument list names `field` exactly, e.g. `KEEP a, _id`. */
const listsColumn = (args: readonly ESQLAstItem[], field: string): boolean =>
  args.some((arg) => isColumn(arg) && arg.name === field);

/**
 * Whether the argument list names `field` or contains a wildcard that could
 * match it (`_*`, `*`). Used for `DROP`, where a wildcard is treated as
 * removing the field because it cannot be proven not to.
 */
const hasColumnMatching = (args: readonly ESQLAstItem[], field: string): boolean =>
  args.some((arg) => isColumn(arg) && (arg.name === field || arg.name.includes('*')));

/** Whether the `RENAME` argument list contains `field AS …` or `… = field`. */
const hasRenameOf = (args: readonly ESQLAstItem[], field: string): boolean =>
  args.some((arg) => isTargetingColumn(arg, field) && (arg.name === 'as' || arg.name === '='));

/** Whether the `EVAL` argument list assigns to `field` (`field = …`). */
const hasAssignmentTo = (args: readonly ESQLAstItem[], field: string): boolean =>
  args.some((arg) => isTargetingColumn(arg, field) && arg.name === '=');

/**
 * Type guard for a function expression whose first argument is the column
 * `columnName`; this is how the AST represents `_id AS alias` and `_id = expr`.
 */
const isTargetingColumn = (arg: ESQLAstItem, columnName: string): arg is ESQLFunction =>
  isFunctionExpression(arg) && isColumn(arg.args[0]) && arg.args[0].name === columnName;
