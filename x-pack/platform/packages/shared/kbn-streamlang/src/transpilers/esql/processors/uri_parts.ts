/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@elastic/esql';
import type { ESQLAstCommand, ESQLAstItem } from '@elastic/esql/types';
import type { UriPartsProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';
import { buildIgnoreMissingFilter, buildWhereCondition, combineOr } from './common';

/**
 * Default column prefix / object target when `to` is not provided. Matches the
 * default of the Elasticsearch `uri_parts` ingest processor (`target_field: "url"`).
 */
const DEFAULT_TARGET = 'url';

/**
 * Suffixes treated as "parse succeeded" signals by `remove_if_successful`.
 * A valid absolute URI populates at least one of these; malformed or empty
 * inputs produce nulls for all parts.
 */
const SUCCESS_SUFFIXES = ['scheme', 'domain'] as const;

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
 *  - `keep_original` (default true): emit `EVAL <to>.original = <from>` so the
 *    raw URI stays alongside the extracted parts, matching the ingest
 *    processor's `target_field.original` shape. In the conditional path the
 *    assignment is gated (`CASE(condition, <from>, NULL)`) so rows that failed
 *    the condition are not touched.
 *  - `remove_if_successful` (default false): emit `EVAL <from> = CASE(<to>.scheme
 *    IS NOT NULL OR <to>.domain IS NOT NULL, NULL, <from>)` so the source field
 *    is nulled only on a successful parse. Both options are less idiomatic in
 *    ES|QL but are included for transpiler parity (see streams-program#554).
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
 *       NOT(`attributes.url` IS NULL), `attributes.url`, NULL
 *     )
 *   ```
 */
export function convertUriPartsProcessorToESQL(processor: UriPartsProcessor): ESQLAstCommand[] {
  const {
    from,
    to = DEFAULT_TARGET,
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

/** `URI_PARTS <prefix> = <expression>` — assignment-style processing command. */
function buildUriPartsCommand(prefix: ESQLAstItem, expression: ESQLAstItem): ESQLAstCommand {
  return Builder.command({
    name: 'uri_parts',
    args: [Builder.expression.func.binary('=', [prefix, expression])],
  });
}

/**
 * `EVAL <prefix>.original = <from>` (or `= CASE(condition, <from>, NULL)` when
 * a `gatedCondition` is provided so the assignment only applies to rows the
 * conditional URI_PARTS actually ran for).
 */
function buildKeepOriginalEval(
  targetPrefix: string,
  sourceColumn: ESQLAstItem,
  gatedCondition: ESQLAstItem | null
): ESQLAstCommand {
  const originalColumn = Builder.expression.column(`${targetPrefix}.original`);
  const rhs: ESQLAstItem = gatedCondition
    ? Builder.expression.func.call('CASE', [
        gatedCondition,
        sourceColumn,
        Builder.expression.literal.nil(),
      ])
    : (sourceColumn as ESQLAstItem);
  return Builder.command({
    name: 'eval',
    args: [Builder.expression.func.binary('=', [originalColumn, rhs])],
  });
}

/**
 * `EVAL <from> = CASE(<to>.scheme IS NOT NULL OR <to>.domain IS NOT NULL, NULL, <from>)`.
 * Nulls the source field only on rows where the parse produced at least one
 * identifying part — matching the ingest processor's "remove only on success"
 * semantics.
 */
function buildRemoveIfSuccessfulEval(
  targetPrefix: string,
  sourceName: string,
  sourceColumn: ESQLAstItem
): ESQLAstCommand {
  const successPredicates = SUCCESS_SUFFIXES.map((suffix) =>
    Builder.expression.func.call('NOT', [
      Builder.expression.func.postfix(
        'IS NULL',
        Builder.expression.column(`${targetPrefix}.${suffix}`)
      ),
    ])
  );
  const success = combineOr(successPredicates)!;
  return Builder.command({
    name: 'eval',
    args: [
      Builder.expression.func.binary('=', [
        Builder.expression.column(sourceName),
        Builder.expression.func.call('CASE', [
          success,
          Builder.expression.literal.nil(),
          sourceColumn,
        ]),
      ]),
    ],
  });
}
