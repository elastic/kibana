/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@elastic/esql';
import type { ESQLAstCommand, ESQLAstItem } from '@elastic/esql/types';
import { isAlwaysCondition } from '../../../../types/conditions';
import type { UriPartsProcessor } from '../../../../types/processors';
import {
  URI_PARTS_DEFAULT_TARGET,
  URI_PARTS_SUCCESS_SUBFIELDS,
} from '../../../../types/processors/uri_parts';
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
 *     `EVAL __streamlang_uri_parts_expression = CASE(<where>, <from>, "")`.
 *     The empty-string fallback makes `URI_PARTS` short-circuit to null
 *     outputs on rows failing the condition, so the temp output stays empty.
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
    keep_original: keepOriginal = true,
    remove_if_successful: removeIfSuccessful = false,
    ignore_missing: ignoreMissing = false,
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
  const missingFieldFilter = buildIgnoreMissingFilter(ignoreMissing, from);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  if (isConditional) {
    commands.push(buildConditionalEval(where!, from, internalExpressionColumn));
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

  commands.push(
    buildCoalescePrefixedFieldsEval([...URI_PARTS_SUCCESS_SUBFIELDS], internalColumnPrefix, to)
  );

  if (keepOriginal) {
    commands.push(buildKeepOriginalEval(to, from));
  }
  if (removeIfSuccessful) {
    commands.push(buildRemoveIfSuccessfulEval(from));
  }

  const dropColumns = URI_PARTS_SUCCESS_SUBFIELDS.map((f) => `${internalColumnPrefix}.${f}`);
  if (isConditional) {
    dropColumns.push(internalExpressionColumn);
  }
  commands.push(buildDropColumns(dropColumns));

  return commands;
}

/**
 * `NOT(__streamlang_uri_parts.scheme IS NULL) OR NOT(...) OR ...` across every
 * primary URI sub-field of the temp prefix. Per the ES|QL URI_PARTS csv-spec,
 * only an unparseable input nulls every column (with a warning); valid relative
 * URIs leave scheme/domain null but populate path/query. Reading off the temp
 * prefix is what makes this predicate reflect "this invocation parsed
 * something" rather than "the target prefix has any non-null sub-field".
 */
function buildSuccessPredicate(): ESQLAstItem {
  const predicates = URI_PARTS_SUCCESS_SUBFIELDS.map((suffix) =>
    Builder.expression.func.call('NOT', [
      Builder.expression.func.postfix(
        'IS NULL',
        Builder.expression.column(`${internalColumnPrefix}.${suffix}`)
      ),
    ])
  );
  return combineOr(predicates)!;
}

/**
 * `EVAL <to>.original = CASE(<success>, <from>, <to>.original)` — only
 * overwrites `<to>.original` when the temp parse succeeded; otherwise the
 * existing value is preserved. Matches the ingest `uri_parts` processor,
 * which writes `target_field.original` only on a successful parse and leaves
 * the document untouched when `ignore_failure: true` swallows a failure.
 */
function buildKeepOriginalEval(targetPrefix: string, sourceField: string): ESQLAstCommand {
  const originalColumn = Builder.expression.column(`${targetPrefix}.original`);
  return Builder.command({
    name: 'eval',
    args: [
      Builder.expression.func.binary('=', [
        originalColumn,
        Builder.expression.func.call('CASE', [
          buildSuccessPredicate(),
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
function buildRemoveIfSuccessfulEval(sourceField: string): ESQLAstCommand {
  const sourceColumn = Builder.expression.column(sourceField);
  return Builder.command({
    name: 'eval',
    args: [
      Builder.expression.func.binary('=', [
        sourceColumn,
        Builder.expression.func.call('CASE', [
          buildSuccessPredicate(),
          Builder.expression.literal.nil(),
          sourceColumn,
        ]),
      ]),
    ],
  });
}
