/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@elastic/esql';
import type { ESQLAstCommand, ESQLAstItem } from '@elastic/esql/types';
import type { Condition } from '../../../../types/conditions';
import { isAlwaysCondition } from '../../../../types/conditions';
import type { UriPartsProcessor } from '../../../../types/processors';
import {
  URI_PARTS_DEFAULT_TARGET,
  URI_PARTS_NUMBER_SUBFIELDS,
  URI_PARTS_STRING_SUBFIELDS,
  URI_PARTS_SUCCESS_SUBFIELDS,
} from '../../../../types/processors/uri_parts';
import { conditionToESQLAst } from '../condition_to_esql';
import {
  buildCoalescePrefixedFieldsEval,
  buildConditionalEval,
  buildDropColumns,
  buildIgnoreMissingFilter,
  combineOr,
} from './common';

const internalColumnPrefix = '__streamlang_uri_parts';
const internalExpressionColumn = '__streamlang_uri_parts_expression';

/**
 * Converts a Streamlang UriPartsProcessor into a list of ES|QL AST commands.
 *
 *
 *  1. `WHERE NOT(<from> IS NULL)` pre-filter when `ignore_missing: false`.
 *  2. If `where` is set (and not `{ always: true }`), gate the input through
 *     `EVAL __streamlang_uri_parts_expression = CASE(<where>, <from>, NULL)`.
 *     The NULL fallback (not `""` — URI_PARTS emits `path = ""` for empty
 *     input, which would leak into the merge step) makes URI_PARTS produce
 *     all-null outputs on rows failing the condition, so the temp output
 *     stays empty and the COALESCE merge preserves prior `<to>.*` values.
 *  3. `URI_PARTS __streamlang_uri_parts = <input>` — parse into a temp prefix
 *     so the user's target fields are never written by the command directly.
 *  4. `EVAL <to>.<f> = COALESCE(__streamlang_uri_parts.<f>, <to>.<f>), ...`
 *     merges the parsed sub-fields into `<to>.*`, preferring the new value
 *     but preserving the prior value whenever the parse produced null. This
 *     is the destructive-overwrite fix: rows that failed `where` (or didn't
 *     parse a given sub-field) keep their pre-existing `<to>.*` value
 *     instead of being silently NULLed.
 *  5. `keep_original` (default true): `EVAL <to>.original = CASE(<success>,
 *     <from>, <to>.original)` — only overwrite `<to>.original` when this
 *     parse succeeded. The success predicate ORs over every primary
 *     sub-field of the temp prefix so partial parses (e.g. relative URIs
 *     with null scheme+domain but populated path/query) still count.
 *  6. `remove_if_successful` (default false): `EVAL <from> = CASE(<success>,
 *     NULL, <from>)` — null the source only when the parse succeeded.
 *  7. `DROP __streamlang_uri_parts.<f>, ..., __streamlang_uri_parts_expression`
 *     to clean up the temp columns introduced in steps 2–3.
 *
 * Reading the success predicate from the temp prefix (`__streamlang_uri_parts.*`)
 * — not from `<to>.*` — is what makes `keep_original` / `remove_if_successful`
 * key off "this invocation's parse succeeded" instead of "any value, possibly
 * pre-existing, is non-null in `<to>.*`".
 *
 * @example
 *   ```typescript
 *   const streamlangDSL: StreamlangDSL = {
 *     steps: [
 *       {
 *         action: 'uri_parts',
 *         from: 'attributes.url',
 *         to: 'attributes.parts',
 *         keep_original: true,
 *         ignore_missing: true,
 *       } as UriPartsProcessor,
 *     ],
 *   };
 *   ```
 *
 *   Generates (conceptually):
 *   ```txt
 *   | URI_PARTS __streamlang_uri_parts = `attributes.url`
 *   | EVAL `attributes.parts.scheme`    = COALESCE(`__streamlang_uri_parts.scheme`,    `attributes.parts.scheme`),
 *          `attributes.parts.domain`    = COALESCE(`__streamlang_uri_parts.domain`,    `attributes.parts.domain`),
 *          ...
 *   | EVAL `attributes.parts.original` = CASE(
 *       NOT(`__streamlang_uri_parts.scheme` IS NULL) OR NOT(`__streamlang_uri_parts.domain` IS NULL) OR ...,
 *       `attributes.url`,
 *       `attributes.parts.original`
 *     )
 *   | DROP `__streamlang_uri_parts.scheme`, ..., `__streamlang_uri_parts.port`
 *   ```
 */
export function convertUriPartsProcessorToESQL(processor: UriPartsProcessor): ESQLAstCommand[] {
  const {
    from,
    to = URI_PARTS_DEFAULT_TARGET,
    keep_original = true,
    remove_if_successful = false,
    ignore_missing = false,
    where,
  } = processor;

  const isConditional = Boolean(where) && !isAlwaysCondition(where!);

  const commands: ESQLAstCommand[] = [];

  // Drop rows whose source field is null when ignore_missing=false. This is
  // the intentional ES|QL-vs-ingest divergence documented on
  // `buildIgnoreMissingFilter` in ./common.ts: the ingest processor raises
  // a "field [<from>] not present" error and rejects the doc, whereas
  // ES|QL has no per-row error primitive so we pre-filter with WHERE and
  // silently drop. The cross-compat spec
  // (`missing source field with ignore_missing=false fails ingest and
  // drops the ES|QL row`) pins both halves of that contract.
  const missingFieldFilter = buildIgnoreMissingFilter(ignore_missing, from);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  if (isConditional) {
    // Use NULL (not the helper's default `""`) as the gated-row sentinel. URI_PARTS
    // emits `path = ""` (non-null) for an empty-string input, which leaks into the
    // COALESCE merge step and clobbers prior `<to>.path` on `where:false` rows.
    // The csv-spec's `nullInputRow` case pins URI_PARTS(NULL) → every output sub-
    // field NULL, so a NULL sentinel makes every merge COALESCE naturally
    // preserve. See the comment on `buildConditionalEval` for the contract.
    commands.push(
      buildConditionalEval(where!, from, internalExpressionColumn, Builder.expression.literal.nil())
    );
  }

  commands.push(
    Builder.command({
      name: 'uri_parts',
      args: [
        Builder.expression.func.binary('=', [
          Builder.expression.column(internalColumnPrefix),
          Builder.expression.column(isConditional ? internalExpressionColumn : from),
        ]),
      ],
    })
  );

  // String sub-fields share a (keyword/text) type so COALESCE merges cleanly via
  // the shared helper.
  commands.push(
    buildCoalescePrefixedFieldsEval([...URI_PARTS_STRING_SUBFIELDS], internalColumnPrefix, to)
  );

  // Numeric sub-fields need an explicit cast on the target side: URI_PARTS emits
  // `port` as `integer`, but a target column dynamic-mapped from a JSON number
  // (e.g. `url.port: 0` in a mapping doc) lands as `long`. ES|QL `COALESCE`
  // requires both arguments to share a type and does not auto-promote
  // integer↔long, so the merge would fail with
  //   "second argument of [COALESCE(..port, target.port)] must be [integer], found type [long]"
  // Wrapping the target in TO_INTEGER normalizes any numeric/keyword/text
  // mapping back to integer to match the URI_PARTS output. Port values are
  // bounded to 0–65535, so the cast is lossless.
  for (const field of URI_PARTS_NUMBER_SUBFIELDS) {
    commands.push(buildNumericCoalesceEval(internalColumnPrefix, to, field));
  }

  const successGuard = isConditional ? where : undefined;
  if (keep_original) {
    commands.push(buildKeepOriginalEval(to, from, successGuard));
  }
  if (remove_if_successful) {
    commands.push(buildRemoveIfSuccessfulEval(from, successGuard));
  }

  const dropColumns = URI_PARTS_SUCCESS_SUBFIELDS.map((f) => `${internalColumnPrefix}.${f}`);
  if (isConditional) {
    dropColumns.push(internalExpressionColumn);
  }
  commands.push(buildDropColumns(dropColumns));

  return commands;
}

/**
 * Builds the "this invocation actually parsed a URI for this row" predicate
 * that `keep_original` and `remove_if_successful` key off.
 *
 * Two parts:
 *   1. `NOT(__streamlang_uri_parts.<sub> IS NULL) OR ...` across every primary
 *      sub-field of the temp prefix. Per the ES|QL URI_PARTS csv-spec, only an
 *      unparseable input nulls every column; valid relative URIs leave
 *      scheme/domain null but populate path/query.
 *   2. When the processor is conditional, AND the above with the `where`
 *      condition itself. This guards against URI_PARTS' empty-string
 *      sentinel: the conditional input gate writes `""` for rows the `where`
 *      rejected, and URI_PARTS emits `path = ""` (non-null) for empty input —
 *      so part (1) alone would mistake a gated row for a successful parse
 *      and overwrite `<to>.original` (or null `<from>`). Re-evaluating the
 *      `where` here costs an extra boolean op per row but is the only way to
 *      distinguish "row gated out" from "row parsed to an empty path" using
 *      column-level operations.
 *
 * Reading the sub-field half off the temp prefix (not `<to>.*`) makes the
 * predicate reflect "did this invocation parse?" instead of "is any value
 * non-null in <to>.*", which would be true for pre-existing data.
 */
function buildSuccessPredicate(where: Condition | undefined): ESQLAstItem {
  const subFieldPredicates = URI_PARTS_SUCCESS_SUBFIELDS.map((suffix) =>
    Builder.expression.func.call('NOT', [
      Builder.expression.func.postfix(
        'IS NULL',
        Builder.expression.column(`${internalColumnPrefix}.${suffix}`)
      ),
    ])
  );
  const subFieldSuccess = combineOr(subFieldPredicates)!;
  if (!where) return subFieldSuccess;
  return Builder.expression.func.binary('and', [conditionToESQLAst(where), subFieldSuccess]);
}

/**
 * `EVAL <to>.<field> = COALESCE(<temp>.<field>, TO_INTEGER(<to>.<field>))` —
 * port-specific merge that wraps the target side in `TO_INTEGER` to match the
 * `integer` type `URI_PARTS` emits. Without this cast, indices where
 * `<to>.<field>` is dynamic-mapped to `long` (the default for JSON integers)
 * make ES|QL reject the COALESCE with a `verification_exception`.
 */
function buildNumericCoalesceEval(
  tempPrefix: string,
  targetPrefix: string,
  field: string
): ESQLAstCommand {
  const targetColumn = Builder.expression.column(`${targetPrefix}.${field}`);
  return Builder.command({
    name: 'eval',
    args: [
      Builder.expression.func.binary('=', [
        targetColumn,
        Builder.expression.func.call('COALESCE', [
          Builder.expression.column(`${tempPrefix}.${field}`),
          Builder.expression.func.call('TO_INTEGER', [targetColumn]),
        ]),
      ]),
    ],
  });
}

/**
 * `EVAL <to>.original = CASE(<success>, <from>, <to>.original)` — only
 * overwrites `<to>.original` when the temp parse succeeded; otherwise the
 * existing value is preserved. Matches the ingest `uri_parts` processor,
 * which writes `target_field.original` only on a successful parse and leaves
 * the document untouched when `ignore_failure: true` swallows a failure.
 */
function buildKeepOriginalEval(
  targetPrefix: string,
  sourceField: string,
  where: Condition | undefined
): ESQLAstCommand {
  const originalColumn = Builder.expression.column(`${targetPrefix}.original`);
  return Builder.command({
    name: 'eval',
    args: [
      Builder.expression.func.binary('=', [
        originalColumn,
        Builder.expression.func.call('CASE', [
          buildSuccessPredicate(where),
          Builder.expression.column(sourceField),
          originalColumn,
        ]),
      ]),
    ],
  });
}

/**
 * `EVAL <from> = CASE(<success>, NULL, <from>)` — nulls the source field only
 * when the temp parse succeeded. Matches the ingest processor's "remove only
 * on success" semantics. Because the success predicate reads from the temp
 * prefix, rows that failed `where` (and therefore produced an empty temp
 * output) keep their original source value.
 */
function buildRemoveIfSuccessfulEval(
  sourceField: string,
  where: Condition | undefined
): ESQLAstCommand {
  const sourceColumn = Builder.expression.column(sourceField);
  return Builder.command({
    name: 'eval',
    args: [
      Builder.expression.func.binary('=', [
        sourceColumn,
        Builder.expression.func.call('CASE', [
          buildSuccessPredicate(where),
          Builder.expression.literal.nil(),
          sourceColumn,
        ]),
      ]),
    ],
  });
}
