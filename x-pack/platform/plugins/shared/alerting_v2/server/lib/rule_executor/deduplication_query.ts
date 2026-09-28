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
 * Per-run deduplication decision for a rule's breach query, derived once by
 * `ExecuteRuleQueryStep` and threaded on `state.deduplication` so
 * `FilterDuplicateEventsStep` and `StoreAlertEventsStep` never have to infer
 * eligibility from the shape of individual rows.
 */
export interface DeduplicationQueryPlan {
  /** The query to execute: rewritten when `eligible`, otherwise the input verbatim. */
  readonly query: string;
  /**
   * Whether rule events produced by this query may receive a deterministic
   * `_id`. `false` means every event is written with an Elasticsearch-
   * generated id, exactly as before deduplication existed.
   */
  readonly eligible: boolean;
  /**
   * Columns expanded by `MV_EXPAND`, in pipeline order. Their per-row values
   * are folded into the deterministic id so expanded rows from one source
   * document keep distinct identities. Empty when not eligible.
   */
  readonly mvExpandFields: readonly string[];
}

const notEligible = (query: string): DeduplicationQueryPlan => ({
  query,
  eligible: false,
  mvExpandFields: [],
});

/**
 * Decides whether a breach query is eligible for rule-event deduplication
 * and, if so, rewrites it so every result row carries the identity needed.
 *
 * Mirrors what the detection engine's ES|QL rule type supports: only
 * non-aggregating `FROM` queries whose rows are still source documents
 * deduplicate; everything else keeps append-per-run behaviour. Concretely a
 * query is **not eligible**, and is returned untouched, when:
 *
 * - it aggregates (`STATS`) — rows are not documents, and authors are not
 *   expected to group by `_id` / `_index` / `_version`;
 * - its source is not `FROM` (`ROW`, `TS`) — there is nothing to attach
 *   `METADATA` to;
 * - any command manipulates a metadata column — `DROP` (including any
 *   wildcard, see {@link hasColumnMatching}), `RENAME`, or `EVAL` assignment —
 *   because the column would no longer be the source document's value and
 *   hashing it could silently merge distinct documents;
 * - any command after an `MV_EXPAND` manipulates the expanded column, for
 *   the same reason applied to the fan-out identity.
 *
 * `MV_EXPAND` is the only fan-out command whose rows receive a distinct
 * identity, again matching the detection engine. A one-to-many `LOOKUP JOIN`
 * (or `FORK`) still qualifies, and its rows share the source document's
 * identity, so only the first is persisted and the rest are counted as
 * deduplicated. Handling those requires a row identity ES|QL does not expose
 * today and is a known, documented limitation rather than an oversight.
 *
 * When eligible, `FROM … METADATA _id, _index, _version` is upserted (fields
 * the author already declared are kept) and the metadata columns are
 * appended to every `KEEP` so they survive projection; see
 * {@link addFieldsToKeepCommands}. Expanded columns are deliberately *not*
 * added to `KEEP`, matching the detection engine: a `KEEP` may precede the
 * `EVAL` that creates the expanded column, so injecting it there would make
 * the query invalid. If an author projects an expanded column away, rows
 * arrive without its value and `resolveRuleEventId` falls back to an
 * Elasticsearch-generated id for them — no deduplication, but no lost rows.
 *
 * Called by `ExecuteRuleQueryStep` before the row limit is appended. The
 * stored rule is never modified. Throws only if `@elastic/esql` fails while
 * mutating or printing the AST (the parser is error-tolerant); the caller
 * logs `RULE_EXECUTION_DEDUP_METADATA_INJECTION_FAILED` and falls back to a
 * not-eligible plan for the original query, so a failure here degrades to
 * "no deduplication for this run" rather than a failed rule execution.
 */
export const planDeduplicationQuery = (query: string): DeduplicationQueryPlan => {
  const { root } = Parser.parse(query);
  const { commands } = root;

  if (commands[0]?.name !== 'from' || isAggregating(commands)) {
    return notEligible(query);
  }

  const mvExpandFields = getMvExpandFields(commands);
  const metadataInvalidated = DEDUPLICATION_METADATA_FIELDS.some((field) =>
    commands.some((command) => invalidatesField(command, field))
  );
  const expansionInvalidated = commands.some(
    (command, index) =>
      command.name === 'mv_expand' &&
      getExpandedField(command) != null &&
      commands
        .slice(index + 1)
        .some((later) => invalidatesField(later, getExpandedField(command) as string))
  );

  if (metadataInvalidated || expansionInvalidated) {
    return notEligible(query);
  }

  DEDUPLICATION_METADATA_FIELDS.forEach((field) =>
    mutate.commands.from.metadata.upsert(root, field)
  );
  addFieldsToKeepCommands(root, DEDUPLICATION_METADATA_FIELDS);

  return { query: BasicPrettyPrinter.print(root), eligible: true, mvExpandFields };
};

/**
 * Whether the pipeline aggregates its rows with `STATS`. Aggregated rows are
 * not source documents, so there is no document identity to deduplicate on.
 */
const isAggregating = (commands: readonly ESQLAstCommand[]): boolean =>
  commands.some((command) => command.name === 'stats');

/**
 * Column names expanded by `MV_EXPAND` commands, in pipeline order.
 *
 * `MV_EXPAND` fans one source document into one row per value, so the
 * source-document identity alone (`_id`, `_index`, `_version`) is no longer
 * unique per row. `resolveRuleEventId` folds the values of these columns into
 * the deterministic `_id` so every expanded row is persisted, matching the
 * detection engine's `generateAlertId` (`retrieveExpandedValues`).
 */
const getMvExpandFields = (commands: readonly ESQLAstCommand[]): string[] =>
  commands.flatMap((command) => {
    const field = command.name === 'mv_expand' ? getExpandedField(command) : undefined;
    return field ? [field] : [];
  });

/** The column an `MV_EXPAND` command expands, if it is a plain column reference. */
const getExpandedField = (command: ESQLAstCommand): string | undefined => {
  const [target] = command.args;
  return isColumn(target) && target.name ? target.name : undefined;
};

/**
 * Keeps the injected metadata columns from being projected away by the
 * author's own `KEEP` commands.
 *
 * `METADATA` only makes a column available; a later `KEEP host.name` would
 * drop it and the row would reach the executor without an `_id`, silently
 * disabling deduplication for that rule. Each field is therefore appended to
 * every `KEEP` that does not already list it. Because
 * {@link planDeduplicationQuery} has already rejected any pipeline that
 * drops, renames or reassigns these fields, there are no stop conditions
 * here — every `KEEP` in an eligible query may safely carry them.
 *
 * Columns are built from their dotted parts so a dotted name is printed as a
 * field path rather than a single backtick-quoted identifier.
 *
 * Only the metadata columns are passed here. They exist from the `FROM`
 * onward, so every `KEEP` in the pipeline can safely list them; the same is
 * not true of `MV_EXPAND`ed columns, which is why those are left alone (see
 * {@link planDeduplicationQuery}).
 *
 * Mutates `root` in place. Has no effect when the pipeline has no `KEEP`.
 */
function addFieldsToKeepCommands(root: ESQLAstQueryExpression, fields: readonly string[]): void {
  root.commands.filter(isKeepCommand).forEach((command) => {
    fields
      .filter((field) => !listsColumn(command.args, field))
      .forEach((field) => command.args.push(Builder.expression.column(field.split('.'))));
  });
}

/** Narrows the command union to `KEEP`, whose `args` are plain column items. */
const isKeepCommand = (command: ESQLAstCommand): command is ESQLCommand<'keep'> =>
  command.name === 'keep';

/**
 * Whether `command` changes what `field` refers to for everything after it,
 * which makes the query ineligible for deduplication. See
 * {@link planDeduplicationQuery}.
 */
const invalidatesField = (command: ESQLAstCommand, field: string): boolean =>
  (command.name === 'drop' && hasColumnMatching(command.args, field)) ||
  (command.name === 'rename' && hasRenameOf(command.args, field)) ||
  (command.name === 'eval' && hasAssignmentTo(command.args, field));

/** Whether the argument list names `field` exactly, e.g. `KEEP a, _id`. */
const listsColumn = (args: readonly ESQLAstItem[], field: string): boolean =>
  args.some((arg) => isColumn(arg) && arg.name === field);

/**
 * Whether a `DROP` argument list names `field`, or contains a wildcard.
 *
 * Any wildcard (`*`, `_*`, but also `host.*`) is treated as dropping the
 * field. This is a deliberate over-approximation inherited from the
 * detection engine: proving that a pattern cannot match `_id` would need
 * glob semantics, so we err toward *not* deduplicating. The cost is that a
 * pattern which clearly cannot match, such as `DROP labels.*`, still makes
 * the rule ineligible and every re-match is written, as before this feature.
 * Narrowing this to patterns that can actually match `field` is a known
 * follow-up.
 */
const hasColumnMatching = (args: readonly ESQLAstItem[], field: string): boolean =>
  args.some((arg) => isColumn(arg) && (arg.name === field || arg.name.includes('*')));

/**
 * Whether a `RENAME` mentions `field` on either side of `AS` / `=`.
 *
 * Both operands are columns, and either position invalidates the field:
 * `_id AS doc_id` and `doc_id = _id` move the value under a new name, while
 * `other AS _id` overwrites it. The AST puts the source column in `args[0]`
 * for `AS` but in `args[1]` for `=`, so every argument is checked rather than
 * a fixed position.
 */
const hasRenameOf = (args: readonly ESQLAstItem[], field: string): boolean =>
  args.some(
    (arg) =>
      isFunctionExpression(arg) &&
      (arg.name === 'as' || arg.name === '=') &&
      referencesColumn(arg, field)
  );

/**
 * Whether an `EVAL` assigns to `field` (`field = …`).
 *
 * Unlike {@link hasRenameOf} this stays positional on purpose: the
 * assignment target is always `args[0]`, and an `EVAL` that merely *reads*
 * the field (`EVAL x = _id`) leaves it intact and must not make the query
 * ineligible.
 */
const hasAssignmentTo = (args: readonly ESQLAstItem[], field: string): boolean =>
  args.some(
    (arg) =>
      isFunctionExpression(arg) &&
      arg.name === '=' &&
      isColumn(arg.args[0]) &&
      arg.args[0].name === field
  );

/** Whether any direct argument of `fn` is the column `columnName`. */
const referencesColumn = (fn: ESQLFunction, columnName: string): boolean =>
  fn.args.some((arg) => isColumn(arg) && arg.name === columnName);
