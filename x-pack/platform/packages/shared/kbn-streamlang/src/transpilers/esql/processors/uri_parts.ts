/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@elastic/esql';
import type { ESQLAstCommand, ESQLAstItem } from '@elastic/esql/types';
import type { UriPartsProcessor } from '../../../../types/processors';
import {
  URI_PARTS_DEFAULT_TARGET,
  URI_PARTS_SUCCESS_SUBFIELDS,
} from '../../../actions/uri_parts/constants';
import { conditionToESQLAst } from '../condition_to_esql';
import { buildIgnoreMissingFilter, buildWhereCondition, combineAnd, combineOr } from './common';

/**
 * Converts a Streamlang UriPartsProcessor into a list of ES|QL AST commands.
 *
 * Conditional execution logic (mirrors DISSECT):
 *  - Neither `ignore_missing` nor `where` is set: emit a single URI_PARTS
 *    command (optionally preceded by `WHERE NOT(<from> IS NULL)`).
 *  - Otherwise: gate URI_PARTS through a temp column using CASE.
 *      * EVAL __temp__ = CASE(condition, <from>, "")
 *      * URI_PARTS <to> = __temp__
 *      * DROP __temp__
 *    Empty-string input makes URI_PARTS emit null for every part, so the
 *    command is a no-op for rows failing the condition.
 *
 * Option parity with the ES `uri_parts` ingest processor:
 *  - `keep_original` (default true): emit
 *    `EVAL <to>.original = CASE(<success>, <from>, NULL)` so the raw URI
 *    only lands alongside the extracted parts when the parse actually
 *    succeeded — matching the ingest processor, which writes `target_field`
 *    (including `.original`) atomically on success and nothing when
 *    `ignore_failure: true` swallows an unparseable input. In the
 *    conditional path the assignment is gated on `condition AND <success>`
 *    so rows that failed the condition are not touched either.
 *  - `remove_if_successful` (default false): emit
 *    `EVAL <from> = CASE(<success>, NULL, <from>)`.
 *  - `<success>` is `<to>.scheme IS NOT NULL OR <to>.domain IS NOT NULL
 *    OR <to>.path IS NOT NULL OR ...` across every primary sub-field. The
 *    csv-spec (elasticsearch#140004) shows ES|QL URI_PARTS accepts relative
 *    URIs — `/app/login?session=expired` parses to null scheme + null
 *    domain + populated path/query — so the success signal must OR across
 *    all primary sub-fields. Only an unparseable input nulls every column.
 *    Both options are less idiomatic in ES|QL but are included for
 *    transpiler parity (see streams-program#554).
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
 *   | EVAL __temp_uri_parts_where_attributes.url__ = CASE(
 *       NOT(`attributes.url` IS NULL), `attributes.url`, ""
 *     )
 *   | URI_PARTS `attributes.parts` = __temp_uri_parts_where_attributes.url__
 *   | DROP __temp_uri_parts_where_attributes.url__
 *   | EVAL `attributes.parts.original` = CASE(
 *       NOT(`attributes.url` IS NULL)
 *         AND (`attributes.parts.scheme` IS NOT NULL
 *           OR `attributes.parts.domain` IS NOT NULL
 *           OR ...),
 *       `attributes.url`, NULL
 *     )
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

  const fromColumn = Builder.expression.column(from);
  const prefixColumn = Builder.expression.column(to);
  const needConditional = ignoreMissing || Boolean(where);
  const commands: ESQLAstCommand[] = [];

  // Drop rows whose source field is null when ignore_missing=false. Emitted
  // unconditionally (both branches) so a `where` clause doesn't accidentally
  // let null sources through — matches dissect.ts / grok.ts.
  const missingFieldFilter = buildIgnoreMissingFilter(ignoreMissing, from);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  if (!needConditional) {
    commands.push(buildUriPartsCommand(prefixColumn, fromColumn));
  } else {
    const condition = buildWhereCondition(from, ignoreMissing, where, conditionToESQLAst);
    const tempFieldName = `__temp_uri_parts_where_${from}__`;
    const tempColumn = Builder.expression.column(tempFieldName);

    commands.push(
      Builder.command({
        name: 'eval',
        args: [
          Builder.expression.func.binary('=', [
            tempColumn,
            Builder.expression.func.call('CASE', [
              condition,
              fromColumn,
              Builder.expression.literal.string(''),
            ]),
          ]),
        ],
      })
    );
    commands.push(buildUriPartsCommand(prefixColumn, tempColumn));
    commands.push(Builder.command({ name: 'drop', args: [tempColumn] }));

    if (keepOriginal) {
      commands.push(buildKeepOriginalEval(to, fromColumn, condition));
    }
    if (removeIfSuccessful) {
      commands.push(buildRemoveIfSuccessfulEval(to, from, fromColumn));
    }
    return commands;
  }

  if (keepOriginal) {
    commands.push(buildKeepOriginalEval(to, fromColumn, /* gatedCondition */ null));
  }
  if (removeIfSuccessful) {
    commands.push(buildRemoveIfSuccessfulEval(to, from, fromColumn));
  }
  return commands;
}

/**
 * `<to>.scheme IS NOT NULL OR <to>.domain IS NOT NULL OR ...` across every
 * primary URI sub-field. Per the ES|QL URI_PARTS csv-spec, only an
 * unparseable input nulls every column (with a warning); valid relative
 * URIs leave scheme/domain null but populate path/query. Shared by
 * `keep_original` and `remove_if_successful` so both options key off the
 * exact same "parse succeeded" signal.
 */
function buildSuccessPredicate(targetPrefix: string): ESQLAstItem {
  const predicates = URI_PARTS_SUCCESS_SUBFIELDS.map((suffix) =>
    Builder.expression.func.call('NOT', [
      Builder.expression.func.postfix(
        'IS NULL',
        Builder.expression.column(`${targetPrefix}.${suffix}`)
      ),
    ])
  );
  return combineOr(predicates)!;
}

/** `URI_PARTS <prefix> = <expression>` — assignment-style processing command. */
function buildUriPartsCommand(prefix: ESQLAstItem, expression: ESQLAstItem): ESQLAstCommand {
  return Builder.command({
    name: 'uri_parts',
    args: [Builder.expression.func.binary('=', [prefix, expression])],
  });
}

/**
 * `EVAL <prefix>.original = CASE(<success>, <from>, NULL)` — or
 * `CASE(gatedCondition AND <success>, <from>, NULL)` when a conditional
 * (`ignore_missing` / `where`) predicate is in play. Gating on the success
 * predicate keeps parity with the ES ingest `uri_parts` processor, which
 * only writes `target_field.original` when the parse succeeded; with
 * `ignore_failure: true` an unparseable URI produces no `target_field.*`
 * at all, so ES|QL must not silently populate `<prefix>.original` either.
 */
function buildKeepOriginalEval(
  targetPrefix: string,
  sourceColumn: ESQLAstItem,
  gatedCondition: ESQLAstItem | null
): ESQLAstCommand {
  const originalColumn = Builder.expression.column(`${targetPrefix}.original`);
  const successPredicate = buildSuccessPredicate(targetPrefix);
  const predicate =
    gatedCondition !== null ? combineAnd([gatedCondition, successPredicate])! : successPredicate;
  return Builder.command({
    name: 'eval',
    args: [
      Builder.expression.func.binary('=', [
        originalColumn,
        Builder.expression.func.call('CASE', [
          predicate,
          sourceColumn,
          Builder.expression.literal.nil(),
        ]),
      ]),
    ],
  });
}

/**
 * `EVAL <from> = CASE(<success>, NULL, <from>)`.
 * Nulls the source field only on rows where the parse populated at least
 * one sub-field. Matches the ingest processor's "remove only on success"
 * semantics. `<success>` is the same predicate used to gate `keep_original`.
 */
function buildRemoveIfSuccessfulEval(
  targetPrefix: string,
  sourceName: string,
  sourceColumn: ESQLAstItem
): ESQLAstCommand {
  return Builder.command({
    name: 'eval',
    args: [
      Builder.expression.func.binary('=', [
        Builder.expression.column(sourceName),
        Builder.expression.func.call('CASE', [
          buildSuccessPredicate(targetPrefix),
          Builder.expression.literal.nil(),
          sourceColumn,
        ]),
      ]),
    ],
  });
}
