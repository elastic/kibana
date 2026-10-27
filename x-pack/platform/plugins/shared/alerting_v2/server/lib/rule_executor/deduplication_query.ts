/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstCommand, ESQLAstItem, ESQLFunction } from '@elastic/esql/types';
import {
  Parser,
  Walker,
  isColumn,
  isFunctionExpression,
  isStringLiteral,
  mutate,
} from '@elastic/esql';

/**
 * Source-document metadata columns that identify a rule event for
 * deduplication. They match the inputs the detection engine's ES|QL rule type
 * hashes (`_id`, `_version`, `_index`) so both engines agree on what "the same
 * source document" means.
 *
 * The rule author opts into deduplication by declaring all three in the
 * query's `METADATA` clause; `resolveRuleEventId` in `build_alert_events.ts`
 * reads them back out of each row to build the deterministic `.rule-events`
 * `_id`.
 */
export const DEDUPLICATION_METADATA_FIELDS = ['_id', '_index', '_version'] as const;

/**
 * Per-run deduplication decision for a rule's breach query, derived once by
 * `ExecuteRuleQueryStep` and threaded on `state.deduplication` so
 * `FilterDuplicateEventsStep` and `StoreAlertEventsStep` never have to infer
 * eligibility from the shape of individual rows.
 */
export interface DeduplicationPlan {
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

const NOT_ELIGIBLE: DeduplicationPlan = { eligible: false, mvExpandFields: [] };

/**
 * Decides whether a breach query is eligible for rule-event deduplication.
 *
 * This is a read-only inspection of the query: the executor never rewrites
 * the author's ES|QL. Deduplication is opt-in by declaring
 * `METADATA _id, _index, _version` on the `FROM`, and the check here only
 * confirms that the declared identity survives to the result. A query is
 * **eligible** when all of the following hold:
 *
 * - its source is `FROM` and it declares every column in
 *   {@link DEDUPLICATION_METADATA_FIELDS} in its `METADATA` clause;
 * - it does not aggregate (`STATS` or `INLINE STATS`) — rows are not
 *   documents, and authors are not expected to group by `_id` / `_index` /
 *   `_version`;
 * - it does not `FORK` — branches are nested sub-pipelines whose rows share
 *   the source document's identity, and a branch could itself rewrite a
 *   metadata column;
 * - no command manipulates a metadata column — `DROP` (including any
 *   wildcard, see {@link hasColumnMatching}), `RENAME`, or any command that
 *   writes to it (see {@link writesColumn}) — because the column would no
 *   longer be the source document's value and hashing it could silently
 *   merge distinct documents;
 * - every `KEEP` lists the metadata columns (or uses a wildcard, see
 *   {@link keepsField}), so the identity is not projected away;
 * - no command after an `MV_EXPAND` manipulates the expanded column, for
 *   the same reason applied to the fan-out identity.
 *
 * Everything else, including any non-aggregating query that simply omits
 * the `METADATA` clause, keeps the append-per-run behaviour. Eligibility is
 * decided from the query rather than from rows so that an aggregating query
 * or one that reassigns `_id` is never deduplicated no matter what its rows
 * contain. Within an eligible run a row may still lack a column (for
 * example an ES|QL view that does not declare `_id` returns `null`), and
 * `resolveRuleEventId` then falls back to an Elasticsearch-generated id for
 * that row.
 *
 * `MV_EXPAND` is the only fan-out command whose rows receive a distinct
 * identity, matching the detection engine. A one-to-many `LOOKUP JOIN`
 * still qualifies, and its rows share the source document's identity, so
 * only the first is persisted and the rest are counted as deduplicated. A
 * `LOOKUP JOIN` whose lookup index carries a column named `_id` would also
 * overwrite the metadata, which cannot be seen from the query. Handling
 * those requires a row identity and lookup-index mappings ES|QL does not
 * expose to the planner today and is a known, documented limitation rather
 * than an oversight.
 *
 * Never throws for a parseable query; the parser is error-tolerant, and an
 * unparseable query simply fails the `FROM` check.
 */
export const planDeduplication = (query: string): DeduplicationPlan => {
  const { root } = Parser.parse(query);
  const { commands } = root;

  if (commands[0]?.name !== 'from' || isAggregating(commands) || hasFork(commands)) {
    return NOT_ELIGIBLE;
  }

  const declaresIdentity = DEDUPLICATION_METADATA_FIELDS.every(
    (field) => mutate.commands.from.metadata.find(root, field) !== undefined
  );
  if (!declaresIdentity) {
    return NOT_ELIGIBLE;
  }

  const metadataInvalidated = DEDUPLICATION_METADATA_FIELDS.some((field) =>
    commands.some((command) => invalidatesField(command, field) || projectsAway(command, field))
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
    return NOT_ELIGIBLE;
  }

  return { eligible: true, mvExpandFields: getMvExpandFields(commands) };
};

/**
 * Whether the pipeline aggregates its rows with `STATS` or `INLINE STATS`.
 * Aggregated rows are not source documents, so there is no document identity
 * to deduplicate on. `INLINE STATS` keeps the source rows, but its aggregate
 * columns are assigned the same way as `STATS` and it is treated
 * conservatively alongside it rather than special-cased.
 */
const isAggregating = (commands: readonly ESQLAstCommand[]): boolean =>
  commands.some((command) => command.name === 'stats' || command.name === 'inline stats');

/**
 * Whether the pipeline contains a `FORK`. Each branch is a nested
 * sub-pipeline, so a top-level scan of `commands` would not see a branch that
 * drops, renames or reassigns a metadata column. Rather than inspect branches
 * recursively, the whole query is treated as ineligible: `FORK` also fans one
 * document into one row per branch, and those rows have no per-row identity
 * to fold into the id the way `MV_EXPAND` values are.
 */
const hasFork = (commands: readonly ESQLAstCommand[]): boolean =>
  commands.some((command) => command.name === 'fork');

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
 * Whether `command` changes what `field` refers to for everything after it,
 * which makes the query ineligible for deduplication. See
 * {@link planDeduplication}.
 */
const invalidatesField = (command: ESQLAstCommand, field: string): boolean =>
  (command.name === 'drop' && hasColumnMatching(command.args, field)) ||
  (command.name === 'rename' && hasRenameOf(command.args, field)) ||
  writesColumn(command, field);

/**
 * Whether a `KEEP` projects `field` away, which makes the query ineligible:
 * the row would reach the executor without its identity. See
 * {@link keepsField}.
 */
const projectsAway = (command: ESQLAstCommand, field: string): boolean =>
  command.name === 'keep' && !keepsField(command.args, field);

/**
 * Whether a `KEEP` argument list retains `field`.
 *
 * An exact listing (`KEEP host.name, _id`) retains it. Any wildcard
 * (`KEEP *`, `KEEP _*`, but also `KEEP host.*`) is also treated as retaining
 * it: proving that a pattern cannot match `_id` would need glob semantics,
 * and the row-level check in `resolveRuleEventId` falls back to an
 * Elasticsearch-generated id for any row that arrives without the column.
 */
const keepsField = (args: readonly ESQLAstItem[], field: string): boolean =>
  args.some((arg) => isColumn(arg) && (arg.name === field || arg.name.includes('*')));

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

/** Commands whose output columns are named inside a string pattern. */
const PATTERN_COMMANDS: ReadonlySet<string> = new Set(['dissect', 'grok']);

/**
 * Whether `command` writes a column named `field`, anywhere in its syntax.
 *
 * This is deliberately not a list of commands. Any command that produces a
 * column does so in one of three shapes, and all three are checked by
 * walking the command's full AST so that a new or unanticipated command is
 * covered as long as it uses the same grammar:
 *
 * - an assignment `field = …`: `EVAL`, `ENRICH … WITH`, `COMPLETION`,
 *   `RERANK`, `INLINE STATS`. The target is always the first argument, and a
 *   command that merely *reads* the field (`EVAL x = _id`) leaves it intact
 *   and must not make the query ineligible, so this stays positional;
 * - an `AS` option naming output columns: `CHANGE_POINT … AS type, pvalue`;
 * - a `DISSECT` / `GROK` pattern string: `"%{_id}"`, `"%{WORD:_id}"`. The
 *   column names are not AST nodes, so the pattern text is scanned for the
 *   field name as a whole token (see {@link patternNamesColumn}).
 *
 * `RENAME`'s `old = new` form puts the source column first, so it is checked
 * separately by {@link hasRenameOf}, which is why `RENAME doc_id = _id` is
 * still ineligible even though this check would not flag it.
 */
const writesColumn = (command: ESQLAstCommand, field: string): boolean => {
  let written = false;
  const found = (walker: { abort: () => void }) => {
    written = true;
    walker.abort();
  };

  Walker.walk(command, {
    visitFunction: (fn, _parent, walker) => {
      if (fn.name === '=' && isColumn(fn.args[0]) && fn.args[0].name === field) {
        found(walker);
      }
    },
    visitCommandOption: (option, _parent, walker) => {
      if (option.name === 'as' && option.args.some((arg) => isColumn(arg) && arg.name === field)) {
        found(walker);
      }
    },
    visitLiteral: (literal, _parent, walker) => {
      if (
        PATTERN_COMMANDS.has(command.name) &&
        isStringLiteral(literal) &&
        patternNamesColumn(literal.valueUnquoted, field)
      ) {
        found(walker);
      }
    },
  });

  return written;
};

/**
 * Whether a `DISSECT` / `GROK` pattern mentions `field` as a whole token:
 * `%{_id}`, `%{+_id}`, `%{_id->}`, `%{WORD:_id}` or `%{WORD:_id:int}` all
 * match, while `%{message_id}` and `%{host._id}` do not. Scanning the text
 * rather than parsing the pattern grammar errs toward ineligibility, which
 * at worst costs the rule deduplication, never correctness.
 */
const patternNamesColumn = (pattern: string, field: string): boolean =>
  new RegExp(`(^|[^\\w.])${escapeRegExp(field)}(?![\\w.])`).test(pattern);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether any direct argument of `fn` is the column `columnName`. */
const referencesColumn = (fn: ESQLFunction, columnName: string): boolean =>
  fn.args.some((arg) => isColumn(arg) && arg.name === columnName);
